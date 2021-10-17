import { getPreferenceValues, List, showToast, ToastStyle } from "@raycast/api";
import { Client } from "@notionhq/client";
import useSWR from "swr";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isValidating } = useSWR(searchText ?? null, searchPages);

  if (error) {
    showToast(ToastStyle.Failure, "Failed searching pages", error instanceof Error ? error.message : undefined);
  }

  console.log(data);

  return (
    <List isLoading={isValidating} onSearchTextChange={setSearchText} throttle>
      {data?.map((i) => (
        <List.Item
          key={i.id}
          icon={i.icon?.type === "emoji" ? i.icon.emoji : undefined}
          title={i.properties?.title?.title?.[0].text.content}
          accessoryTitle={i.last_edited_time}
        />
      ))}
    </List>
  );
}

const { token } = getPreferenceValues<{ token: string }>();
const client = new Client({
  auth: token,
});

async function searchPages(query: string) {
  console.log(query);

  const response = await client.search({
    query,
    sort: {
      direction: "ascending",
      timestamp: "last_edited_time",
    },
  });
  return response.results;
}
