import useSWR from "swr";
import { DefaultLayout } from "@/interface/default-layout";
import { Banner, Heading, Stack } from "@primer/react";

import { OutputFromHandler } from "@/models/authorization";
import { features } from "@/models/feature";

import { Card } from "@primer/react/dist/Card";

type ApplicationStatus = OutputFromHandler<typeof features.READ.STATUS.DEFAULT>;

async function fetchAPI(key: string) {
  const response = await fetch(key);
  const responseBody = await response.json();
  return responseBody;
}

export default function StatusPage() {
  const { isLoading, data, error } = useSWR<ApplicationStatus>(
    "/api/v1/status",
    fetchAPI,
    {
      refreshInterval: 2000,
    },
  );

  return (
    <DefaultLayout contentWidth="medium" metadata={{ title: "Status" }}>
      <Stack gap="spacious">
        <Heading as="h1">Status</Heading>
        <Database
          isLoading={isLoading}
          database={data?.dependencies?.database}
          error={error}
        />
        <UpdatedAt isLoading={isLoading} updatedAt={data?.updated_at} />
      </Stack>
    </DefaultLayout>
  );
}

type DatabaseProps = {
  isLoading: boolean;
  error: string;
  database?: ApplicationStatus["dependencies"]["database"];
};

function Database({ isLoading, database, error }: DatabaseProps) {
  if (error) {
    return (
      <Banner variant="critical">
        <Banner.Title>Error loading data.</Banner.Title>
        <Banner.Description>{error}</Banner.Description>
      </Banner>
    );
  }

  if (isLoading) {
    return;
  }

  if (!database) {
    return (
      <Banner variant="warning">
        <Banner.Title>No data available.</Banner.Title>
        <Banner.Description>Por favor tente mais tarde.</Banner.Description>
      </Banner>
    );
  }

  const openedConnections = database.opened_connections;
  const maxConnections = database.max_connections;
  const version = database.version ?? "-";

  return (
    <Stack>
      <Heading as="h2" variant="medium">
        Database
      </Heading>
      <Stack direction={{ narrow: "vertical", regular: "horizontal" }}>
        <Stack.Item grow>
          <Card>
            <Card.Heading>Open connections</Card.Heading>
            <Card.Description>{openedConnections}</Card.Description>
            <Card.Metadata>Now using</Card.Metadata>
          </Card>
        </Stack.Item>
        <Stack.Item grow>
          <Card>
            <Card.Heading>Max connections</Card.Heading>
            <Card.Description>{maxConnections}</Card.Description>
            <Card.Metadata>Maximum allowed</Card.Metadata>
          </Card>
        </Stack.Item>
        <Stack.Item grow>
          <Card>
            <Card.Heading>PostgreSQL</Card.Heading>
            <Card.Description>{version}</Card.Description>
            <Card.Metadata>Current Version</Card.Metadata>
          </Card>
        </Stack.Item>
      </Stack>
    </Stack>
  );
}

type UpdatedAtProps = {
  isLoading: boolean;
  updatedAt?: ApplicationStatus["updated_at"];
};

function UpdatedAt({ isLoading, updatedAt }: UpdatedAtProps) {
  let updatedAtText = "Loading...";

  if (!isLoading && updatedAt) {
    updatedAtText = new Date(updatedAt.toString()).toLocaleString("pt-PT");
  }

  return (
    <Banner variant="info" layout="compact">
      <Banner.Title>Last updated: {updatedAtText}</Banner.Title>
    </Banner>
  );
}
