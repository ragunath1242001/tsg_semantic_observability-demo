import "./contact.css";

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import clsx from "clsx";

import styles from "./index.module.css";

// Professional SVG Icons
const BusinessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="80px" height="80px" fill="currentColor" stroke="currentColor" viewBox="0 0 512 512">
    <line x1="176" y1="416" x2="176" y2="480" style={{fill:"none",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"32px"}}/>
    <path d="M80,32H272a32,32,0,0,1,32,32V476a4,4,0,0,1-4,4H48a0,0,0,0,1,0,0V64A32,32,0,0,1,80,32Z" style={{fill:"none",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"32px"}}/>
    <path d="M320,192H432a32,32,0,0,1,32,32V480a0,0,0,0,1,0,0H304a0,0,0,0,1,0,0V208A16,16,0,0,1,320,192Z" style={{fill:"none",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"32px"}}/>
    <path d="M98.08,431.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,431.87Z"/>
    <path d="M98.08,351.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,351.87Z"/>
    <path d="M98.08,271.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,271.87Z"/>
    <path d="M98.08,191.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,191.87Z"/>
    <path d="M98.08,111.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,98.08,111.87Z"/>
    <path d="M178.08,351.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,351.87Z"/>
    <path d="M178.08,271.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,271.87Z"/>
    <path d="M178.08,191.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,191.87Z"/>
    <path d="M178.08,111.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,178.08,111.87Z"/>
    <path d="M258.08,431.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,431.87Z"/>
    <path d="M258.08,351.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,351.87Z"/>
    <path d="M258.08,271.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,271.87Z"/>
    <ellipse cx="256" cy="176" rx="15.95" ry="16.03" transform="translate(-49.47 232.56) rotate(-45)"/>
    <path d="M258.08,111.87a16,16,0,1,1,13.79-13.79A16,16,0,0,1,258.08,111.87Z"/>
    <path d="M414,400a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/>
    <path d="M414,320a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/>
    <path d="M414,240a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/>
    <path d="M350,400a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/>
    <path d="M350,320a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/>
    <path d="M350,240a16,16,0,1,0,16,16,16,16,0,0,0-16-16Z"/></svg>
);

const GitLabIcon = () => (
  <svg width="80" height="80" viewBox="0 0 512 512" fill="currentColor" stroke="currentColor">
<path xmlns="http://www.w3.org/2000/svg" d="M494.07,281.6l-25.18-78.08a11,11,0,0,0-.61-2.1L417.78,44.48a20.08,20.08,0,0,0-19.17-13.82A19.77,19.77,0,0,0,379.66,44.6L331.52,194.15h-152L131.34,44.59a19.76,19.76,0,0,0-18.86-13.94h-.11a20.15,20.15,0,0,0-19.12,14L42.7,201.73c0,.14-.11.26-.16.4L16.91,281.61a29.15,29.15,0,0,0,10.44,32.46L248.79,476.48a11.25,11.25,0,0,0,13.38-.07L483.65,314.07a29.13,29.13,0,0,0,10.42-32.47m-331-64.51L224.8,408.85,76.63,217.09m209.64,191.8,59.19-183.84,2.55-8h86.52L300.47,390.44M398.8,59.31l43.37,134.83H355.35M324.16,217l-43,133.58L255.5,430.14,186.94,217M112.27,59.31l43.46,134.83H69M40.68,295.58a6.19,6.19,0,0,1-2.21-6.9l19-59L197.08,410.27M470.34,295.58,313.92,410.22l.52-.69L453.5,229.64l19,59a6.2,6.2,0,0,1-2.19,6.92"/>  </svg>
);

const DevelopersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="80px" height="80px" viewBox="0 0 24 24">
  <path d="M.221 16.268a15.064 15.064 0 0 0 1.789 1.9C2.008 18.111 2 18.057 2 18a5.029 5.029 0 0 1 3.233-4.678 1 1 0 0 0 .175-1.784A2.968 2.968 0 0 1 4 9a2.988 2.988 0 0 1 5.022-2.2 5.951 5.951 0 0 1 2.022-.715 4.994 4.994 0 1 0-7.913 6.085 7.07 7.07 0 0 0-2.91 4.098zM23.779 16.268a7.07 7.07 0 0 0-2.91-4.1 4.994 4.994 0 1 0-7.913-6.086 5.949 5.949 0 0 1 2.022.715 2.993 2.993 0 1 1 3.614 4.74 1 1 0 0 0 .175 1.784A5.029 5.029 0 0 1 22 18c0 .057-.008.111-.01.167a15.065 15.065 0 0 0 1.789-1.899z"/>
  <path d="M18.954 20.284a7.051 7.051 0 0 0-3.085-5.114A4.956 4.956 0 0 0 17 12a5 5 0 1 0-8.869 3.17 7.051 7.051 0 0 0-3.085 5.114 14.923 14.923 0 0 0 1.968.849C7.012 21.088 7 21.046 7 21a5.031 5.031 0 0 1 3.233-4.678 1 1 0 0 0 .175-1.785A2.964 2.964 0 0 1 9 12a3 3 0 1 1 6 0 2.964 2.964 0 0 1-1.408 2.537 1 1 0 0 0 .175 1.785A5.031 5.031 0 0 1 17 21c0 .046-.012.088-.013.133a14.919 14.919 0 0 0 1.967-.849z"/>
</svg>

);

function ContactHeader() {
  return (
    <header className={clsx("hero", styles.heroBanner, "contact-hero")}>
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
        <BusinessIcon />
        <h2>Business Developer</h2>
        <p>Herman Pals</p>
        <p>Email: herman.pals@tno.nl</p>
        <p>Phone: +31 88 866 72 17</p>
      </div>

      <div className="contact-block">
        <GitLabIcon />
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
        <DevelopersIcon />
        <h2>Software Development</h2>
        <p>
          For technical queries or to speak with our development team, get in
          touch with our software engineers.
        </p>
        <div className="email-with-avatar">
          <img
            src="https://gravatar.com/avatar/b83cce57c8f0ed53163e60cfdee8acf7b5c52e62e9e80c38720370b467d25b3b"
            className="avatar"
            alt="Maarten Kollenstart"
          />
          <p>maarten.kollenstart@tno.nl</p>
        </div>
        <div className="email-with-avatar">
          <img
            src="https://gravatar.com/avatar/9000d9f4446ff875f90e5ba3ac8c156fef553bc99831e1695576209788799122"
            className="avatar"
            alt="Willem Datema"
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
