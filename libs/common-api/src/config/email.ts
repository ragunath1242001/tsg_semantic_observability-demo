import { IsBoolean, IsNumber, IsString, ValidateIf } from "class-validator";
import { Description } from "../utils/configToMarkdown.js";

export class NodemailerConfiguration {
  @Description("Enable email sending")
  @IsBoolean()
  enabled: boolean = false;
  @Description("Email address to send emails from")
  @IsString()
  @ValidateIf((c) => c.enabled)
  smtpFrom!: string;
  @Description("SMTP port")
  @IsNumber()
  @ValidateIf((c) => c.enabled)
  smtpPort: number = 465;
  @Description("SMTP secure connection")
  @IsBoolean()
  @ValidateIf((c) => c.enabled)
  smtpSecure: boolean = true;
  @Description("SMTP server")
  @IsString()
  @ValidateIf((c) => c.enabled)
  smtpServer!: string;
  @Description("SMTP user")
  @IsString()
  @ValidateIf((c) => c.enabled)
  smtpUser!: string;
  @Description("SMTP password")
  @IsString()
  @ValidateIf((c) => c.enabled)
  smtpPassword!: string;
  @Description("Title")
  @IsString()
  @ValidateIf((c) => c.enabled)
  title!: string;
}
