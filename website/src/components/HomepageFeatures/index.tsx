import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";

import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Documentation",
    Svg: require("@site/static/img/documentation.svg").default,
    link: "/docs/",
    description: (
      <>
        Comprehensive documentation covering installation, configuration, and usage guides. 
        Learn how to deploy and integrate the TNO Security Gateway into your data space 
        infrastructure with step-by-step tutorials.
      </>
    )
  },
  {
    title: "APIs",
    Svg: require("@site/static/img/api.svg").default,
    link: "/docs/apis/control-plane/tsg-control-plane/",
    description: (
      <>
        Explore the Control Plane API and other service endpoints with interactive documentation. 
        Complete OpenAPI specifications for all components including authentication, 
        data contracts, and policy management.
      </>
    )
  },
  {
    title: "Contact",
    Svg: require("@site/static/img/contact-us.svg").default,
    link: "/contact/",
    description: (
      <>
        Get in touch with the TNO Security Gateway team for support, questions, or collaboration. 
        Find contact information, support channels, and ways to contribute to the project.
      </>
    )
  }
];

function Feature({ title, Svg, description, link }: FeatureItem) {
  return (
    <Link to={link} className={styles.featureCard}>
      <div className={styles.featureIcon}>
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className={styles.featureContent}>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </Link>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <Heading as="h2" className={styles.featuresTitle}>
            What Makes TSG Different?
          </Heading>
          <p className={styles.featuresSubtitle}>
            A complete platform for secure, sovereign data space participation
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <div className={styles.aboutSection}>
          <div className={styles.aboutContent}>
            <Heading as="h3" className={styles.aboutTitle}>
              European Standards for Data Sovereignty
            </Heading>
            <p className={styles.aboutText}>
              The <strong>TNO Security Gateway (TSG)</strong> is a complete platform that enables 
              organizations to participate securely in data spaces where multiple parties can discover, 
              negotiate, and exchange data while maintaining full control over their assets.
            </p>
            <p className={styles.aboutText}>
              Founded on the European Commission's{" "}
              <a
                href="https://digital-strategy.ec.europa.eu/en/policies/strategy-data"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.aboutLink}>
                European strategy for data
              </a>
              {" "}and the{" "}
              <a
                href="https://digital-strategy.ec.europa.eu/en/policies/data-spaces"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.aboutLink}>
                Common European Data Spaces
              </a>
              {" "}initiative, TSG provides the technical infrastructure needed to realize 
              trusted, interoperable data sharing across Europe.
            </p>
            <div className={styles.capabilitiesGrid}>
              <div className={styles.capability}>
                <h4>Sovereign Data Exchange</h4>
                <p>Organizations retain full control over their data while participating in collaborative ecosystems</p>
              </div>
              <div className={styles.capability}>
                <h4>Trust Without Centralization</h4>
                <p>Cryptographic proof and verifiable credentials establish trust without requiring a central authority</p>
              </div>
              <div className={styles.capability}>
                <h4>Interoperable Standards</h4>
                <p>Industry-standard protocols ensure compatibility across different data space implementations</p>
              </div>
              <div className={styles.capability}>
                <h4>Simple Deployment</h4>
                <p>Streamlined setup process with CLI tools and containerized components for quick installation</p>
              </div>
              <div className={styles.capability}>
                <h4>Privacy-Preserving Analytics</h4>
                <p>Enable secure multi-party computation and federated learning without exposing raw data</p>
              </div>
              <div className={styles.capability}>
                <h4>Policy-Based Access Control</h4>
                <p>Fine-grained access policies with automated enforcement and compliance monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
