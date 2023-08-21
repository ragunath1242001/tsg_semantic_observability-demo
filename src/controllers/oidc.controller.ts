import { Controller, All, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { ServerConfig } from "../config";
// import Provider from "oidc-provider";

@Controller("oidc")
export class OidcController {
  constructor(private readonly server: ServerConfig) {}
  // private readonly oidc = new Provider(this.server.publicAddress, {
  //   clients: [{
  //     client_id: 'foo',
  //     client_secret: 'bar'
  //   }]
  // });
  // private readonly callback = this.oidc.callback();

  @All('*')
  public mountedOidc(@Req() req: Request, @Res() res: Response): void {
    // req.url = req.originalUrl.replace('/oidc', '');
    // this.callback(req, res);
  }
}