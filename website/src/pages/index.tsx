import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>
              {siteConfig.tagline}
            </p>
            <p className={styles.heroDescription}>
              An open-source Participant Agent implementation based on European standards 
              like the Eclipse Dataspace Protocol, providing secure and standardized 
              data sharing capabilities.
            </p>
            <div className={styles.buttons}>
              <Link className={clsx("button button--lg", styles.primaryButton)} to="/docs/">
                Explore Documentation
              </Link>
              <Link className={clsx("button button--lg", styles.secondaryButton)} to="/docs/apis/">
                View APIs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="TNO Security Gateway - Open-source Participant Agent implementation for secure data sharing">
      <HomepageHeader />
      <main className={styles.main}>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
