import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "../components/HomepageFeatures";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./index.module.css";
import "./contact.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faCodeBranch,
  faUsers
} from "@fortawesome/free-solid-svg-icons";

function ContactHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Contact
        </Heading>
      </div>
    </header>
  );
}

const Contact: React.FC = () => {
  return (
    <div className="contact-container">
      <div className="contact-block">
        <FontAwesomeIcon icon={faBriefcase} className="contact-icon" />
        <h2>Business Developer</h2>
        <p>Herman Pals</p>
        <p>Email: herman.pals@tno.nl</p>
        <p>Phone: +31 88 866 72 17</p>
      </div>

      <div className="contact-block">
        <FontAwesomeIcon icon={faCodeBranch} className="contact-icon" />

        <h2>GitLab Repository</h2>
        <p>
          For source code and contributions, check out our GitLab repository.
        </p>
        <p>
          <a
            href="https://gitlab.com/tno-tsg/dataspace-protocol/tno-security-gateway"
            target="_blank"
            rel="noopener noreferrer">
            Visit our GitLab
          </a>
        </p>
      </div>

      <div className="contact-block">
        <FontAwesomeIcon icon={faUsers} className="contact-icon" />

        <h2>Software Development</h2>
        <p>
          For technical queries or to speak with our development team, get in
          touch with our software engineers.
        </p>
        <div className="email-with-avatar">
          <img
            src="https://gravatar.com/avatar/b83cce57c8f0ed53163e60cfdee8acf7b5c52e62e9e80c38720370b467d25b3b"
            className="avatar"
          />
          <p>maarten.kollenstart@tno.nl</p>
        </div>
        <div className="email-with-avatar">
          <img
            src="https://gravatar.com/avatar/9000d9f4446ff875f90e5ba3ac8c156fef553bc99831e1695576209788799122"
            className="avatar"
          />
          <p>willem.datema@tno.nl</p>
        </div>
      </div>
    </div>
  );
};

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="TNO Security Gateway Architecture and Documentation.">
      <ContactHeader />
      <main>
        <Contact />
      </main>
    </Layout>
  );
}
