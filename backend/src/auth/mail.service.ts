import { Injectable, Logger } from "@nestjs/common";
import { MailConfig, RootConfig } from "../config.js";
import { Transporter, createTransport } from "nodemailer";


/** Email content part, either paragraph(s) or a button */
export interface Content {
  paragraphs?: string[];
  button?: { url: string; text: string };
}

export interface TemplateParameters {
  email: string;
  sender: string;
  title: string;
  summary: string;
  link: string;
  img: string;
  header: string;
  content: Content[];
  footer: string;
}

@Injectable()
export class MailService {
  public enabled: boolean;
  private transport?: Transporter;
  constructor(private readonly config: RootConfig) {
    if (config.mail) {
      this.enabled = true;
      this.init(config.mail);
    } else {
      this.enabled = false;
    }
  }

  // transporter

  private readonly logger = new Logger(this.constructor.name);

  async init(mail: MailConfig) {
    this.transport = createTransport({
      host: mail.smtp.host,
      port: mail.smtp.port,
      secure: mail.smtp.secure,
      auth: {
        user: mail.smtp.user,
        pass: mail.smtp.password
      }
    })
  }

  async sendMail(parameters: TemplateParameters): Promise<boolean> {
    if (this.enabled) {
      const info = await this.transport?.sendMail({
        from: `"${this.config.mail?.title}" <${this.config.mail?.smtp?.from}>`,
        to: parameters.email,
        subject: parameters.title,
        html: this.emailHtmlTemplate(parameters),
        text: this.emailTextTemplate(parameters)
      });
      this.logger.debug(`Send mail: ${info}`)
      return true;
    } else {
      return false;
    }
  }

  private emailHtmlTemplate (p: TemplateParameters): string {
    return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><title>${p.title}</title><meta http-equiv="X-UA-Compatible" content="IE=edge"/><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style type="text/css"> #outlook a{padding: 0;}body{margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}table, td{border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;}img{border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic;}p{display: block; margin: 13px 0;}</style><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]--><!--[if lte mso 11]><style type="text/css"> .mj-outlook-group-fix{width: 100% !important;}</style><![endif]--><style type="text/css"> @media only screen and (min-width: 480px){.mj-column-per-100{width: 100% !important; max-width: 100%;}}</style><style media="screen and (min-width:480px)"> .moz-text-html .mj-column-per-100{width: 100% !important; max-width: 100%;}</style><style type="text/css"> [owa] .mj-column-per-100{width: 100% !important; max-width: 100%;}</style><style type="text/css"> @media only screen and (max-width: 480px){table.mj-full-width-mobile{width: 100% !important;}td.mj-full-width-mobile{width: auto !important;}}</style></head><body style="word-spacing: normal; background-color: #f4f4f4"><div style="background-color: #f4f4f4"><div style="margin: 0px auto; max-width: 600px"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%"><tbody><tr><td style="direction: ltr; font-size: 0px; padding: 20px 0px 20px 0px; text-align: center;"><div class="mj-column-per-100 mj-outlook-group-fix" style="font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top" width="100%"><tbody><tr><td align="left" style="font-size: 0px; padding: 0px 0px 0px 25px; padding-top: 0px; padding-bottom: 0px; word-break: break-word;"><div style="font-family: Arial, sans-serif; font-size: 13px; letter-spacing: normal; line-height: 1; text-align: left; color: #000000;"><p class="text-build-content" data-testid="tk0ONwDYibp" style="margin: 10px 0; margin-top: 10px; margin-bottom: 10px;">${p.summary}</p></div></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="margin: 0px auto; max-width: 600px"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%;background: #ffffff; background-color: #ffffff;"><tbody><tr><td style="direction: ltr; font-size: 0px; padding: 20px 0; padding-bottom: 0px; padding-top: 0px; text-align: center;"><div class="mj-column-per-100 mj-outlook-group-fix" style="font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top" width="100%"><tbody><tr><td align="center" style="font-size: 0px; padding: 10px 25px; padding-top: 0px; padding-right: 0px; padding-bottom: 0px; padding-left: 0px; word-break: break-word;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-spacing: 0px;"><tbody><tr><td style="width: 600px"><a href="${p.link}" target="_blank"><img alt="" height="auto" src="${p.img}" style="border: none; border-radius: px; display: block; outline: none; text-decoration: none; height: auto; width: 100%; font-size: 13px;" width="600"/></a></td></tr></tbody></table></td></tr></tbody></table></div></td></tr></tbody></table></div><div style="background: #ffffff; background-color: #ffffff; margin: 0px auto; max-width: 600px;"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; background-color: #ffffff; width: 100%"><tbody><tr><td style="direction: ltr; font-size: 0px; padding: 20px 0px 20px 0px; text-align: center;"><div class="mj-column-per-100 mj-outlook-group-fix" style="font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top" width="100%"><tbody><tr><td align="left" style="font-size: 0px; padding: 0px 25px 0px 25px; padding-top: 0px; padding-bottom: 0px; word-break: break-word;"><div style="font-family: Arial, sans-serif; font-size: 13px; letter-spacing: normal; line-height: 1; text-align: left; color: #000000;"><h1 class="text-build-content" data-testid="lqB0IkDEmBo" style="margin-top: 10px; margin-bottom: 10px; font-weight: normal;">${p.header}</h1></div></td></tr>${p.content.map(c => this.createContent(c)).join('')}</tbody></table></div></td></tr></tbody></table></div><div style="margin: 0px auto; max-width: 600px"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%"><tbody><tr><td style="direction: ltr; font-size: 0px; padding: 20px 0; text-align: center;"><div class="mj-column-per-100 mj-outlook-group-fix" style="font-size: 0px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align: top" width="100%"><tbody><tr><td align="left" style="font-size: 0px; padding: 10px 25px; padding-top: 0px; padding-bottom: 0px; word-break: break-word;"><div style="font-family: Arial, sans-serif; font-size: 13px; letter-spacing: normal; line-height: 1; text-align: left; color: #000000;"><p class="text-build-content" data-testid="bEbNX1Ukp" style="margin: 10px 0; margin-top: 10px; margin-bottom: 10px;"><span style="color: #55575d; font-family: Arial, Helvetica, sans-serif; font-size: 13px;">${p.footer}</span></p></div></td></tr></tbody></table></div></td></tr></tbody></table></div></div></body></html>`;
  }
  
  /** Text email template for user related emails */
  private emailTextTemplate (p: TemplateParameters): string {
    return `${p.title}
  
  
  ${p.content.map(c => {
      if (c.paragraphs && c.paragraphs.length > 0) {
          return c.paragraphs.join('\n');
      } else if (c.button) {
          return `${c.button.text}: ${c.button.url}`;
      }
  }).join('\n')}
  
  
  
  ${p.footer}
  `;
  }
  
  /** Construct HTML based on content, if it is an button a paragraph will be added with the contents of the link */
  private createContent (content: Content): string {
    if (content.paragraphs && content.paragraphs?.length > 0) {
      const paragraph = (p: string) => {
        try {
          const url = new URL(p);
          return `<p class="text-build-content" style="margin: 10px 0; margin-top: 10px"><a class="link-build-content" style="color: inherit; text-decoration: none" target="_blank" href="${url}"><span style="color: #55575d; font-family: Arial; font-size: 13px;"><u>${url}</u></span></a></p>`;
        } catch (_) {
          return `<p class="text-build-content" style="margin: 10px 0; margin-top: 10px">${p}</p>`;
        }
      };
      return `<tr><td align="left" style="font-size: 0px; padding: 0px 25px 0px 25px; padding-top: 0px; padding-bottom: 0px; word-break: break-word;"><div style="font-family: Arial, sans-serif; font-size: 13px; letter-spacing: normal; line-height: 1; text-align: left; color: #000000;">${content.paragraphs.map(p => paragraph(p)).join('')}</div></td></tr>`;
    } else if (content.button) {
      return `<tr><td align="center" vertical-align="middle" style="font-size: 0px; padding: 10px 25px; word-break: break-word;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: separate; line-height: 100%"><tbody><tr><td align="center" bgcolor="#414141" role="presentation" style="border: none; border-radius: 3px; cursor: auto; mso-padding-alt: 10px 25px; background: #414141;" valign="middle"><a href="${content.button.url}" style="display: inline-block; background: #414141; color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: normal; line-height: 120%; margin: 0; text-decoration: none; text-transform: none; padding: 10px 25px; mso-padding-alt: 0px; border-radius: 3px;" target="_blank">${content.button.text}</a></td></tr></tbody></table></td></tr><tr><td align="left" style="font-size: 0px; padding: 0px 25px 0px 25px; padding-top: 0px; padding-bottom: 0px; word-break: break-word;"><div style="font-family: Arial, sans-serif; font-size: 13px; letter-spacing: normal; line-height: 1; text-align: left; color: #000000;"><p class="text-build-content" style="margin: 10px 0; margin-top: 10px">If the button doesn't work, copy the following URL into your browser: <a class="link-build-content" style="color: inherit; text-decoration: none" target="_blank" href="${content.button.url}"><span style="color: #55575d; font-family: Arial; font-size: 13px;"><u>${content.button.url}</u></span></a></p></div></td></tr>`;
    }
    return '';
  }
}