import { DefaultLayout } from "@/interface/default-layout";

const metadata = {
  description:
    "O Finances é um lugar para construir uma comunidade de desenvolvedores.",
};

function Home() {
  return (
    <DefaultLayout metadata={metadata}>
      <h1>{metadata.description}</h1>
    </DefaultLayout>
  );
}

export default Home;
