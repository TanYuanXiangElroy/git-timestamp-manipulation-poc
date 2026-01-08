// src/app/actions.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function fetchContributions(year: number) {
  // 1. Get the session (Current Logged In User)
  const session = await getServerSession(authOptions);

  // @ts-expect-error: session typing
  const token = session?.accessToken;
  // @ts-expect-error: session typing
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
                contributionCount
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

  // Store RAW COUNTS
  const contributionMap: Record<string, number> = {};
  let maxCount = 0; // Track the highest number of commits found

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weeks.forEach((week: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    week.contributionDays.forEach((day: any) => {
      contributionMap[day.date] = day.contributionCount;
      if (day.contributionCount > maxCount) {
        maxCount = day.contributionCount;
      }
    });
  });

  // Return BOTH the map and the max
  return {
    data: contributionMap,
    max: maxCount
  };
}