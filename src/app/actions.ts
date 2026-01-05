// src/app/actions.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function fetchContributions(year: number) {
  // 1. Get the session (Current Logged In User)
  const session = await getServerSession(authOptions);

  // @ts-expect-error
  const token = session?.accessToken;
  // @ts-expect-error
  const username = session?.user?.login;

  if (!token || !username) {
    throw new Error("You must be logged in to import data.");
  }

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionLevel
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { username, from, to },
    }),
    cache: "no-store", 
  });

  const json = await res.json();

  if (json.errors) {
    console.error(json.errors);
    throw new Error(json.errors[0].message);
  }

  // --- Same mapping logic as before ---
  const levelMap: Record<string, number> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };

  const contributionMap: Record<string, number> = {};
  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  
  type Day = { date: string; contributionLevel: string };
  type Week = { contributionDays: Day[] };

  weeks.forEach((week: Week) => {
    week.contributionDays.forEach((day: Day) => {
      contributionMap[day.date] = levelMap[day.contributionLevel] || 0;
    });
  });

  return contributionMap;
}