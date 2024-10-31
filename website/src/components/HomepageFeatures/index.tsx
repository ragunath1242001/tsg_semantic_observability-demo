import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Documentation",
    Svg: require("@site/static/img/documentation.svg").default,
    description: (
      <>
        The <a href="docs">documentation</a> covers the Architecture overview,
        developer documentation and steps to deploy the Participant Agent.
      </>
    )
  },
  {
    title: "APIs",
    Svg: require("@site/static/img/api.svg").default,
    description: (
      <>
        The APIs are documented by OpenAPI specifications, visit{" "}
        <a href="docs/apis/control-plane/tsg-control-plane">APIs</a> to view
        them.
      </>
    )
  },
  {
    title: "Contact",
    Svg: require("@site/static/img/contact-us.svg").default,
    description: (
      <>
        Interested in using the TNO Security Gateway? Get in{" "}
        <a href="contact">contact</a>!
      </>
    )
  }
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4 ")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
        <div className="row">
          <p>
            The <i>TNO Security Gateway (TSG)</i> is an open-source Participant
            Agent implementation, initially developed at TNO. This site provides
            explanations of the high-level architecture and the in-depth
            documentation of the TSG. The high-level architecture is based on
            European standards such as the{" "}
            <a
              href="https://docs.internationaldataspaces.org/ids-knowledgebase/dataspace-protocol"
              target="_blank">
              Eclipse Dataspace Protocol
            </a>
            .
          </p>
          <p></p>
        </div>
      </div>
    </section>
  );
}
