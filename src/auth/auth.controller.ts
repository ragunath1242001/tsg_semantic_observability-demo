import { Controller, Get, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('')
export class AuthController {
    constructor(
        private readonly authService: AuthService) {}
    
    @Get('.well-known/did.json')
    @Header('Content-Type', 'application/json')
    @HttpCode(HttpStatus.OK)
    async getDid() {
        return await this.authService.getDid()
    }

    @Get('.well-known/participant.json')
    @Header('Content-Type', 'application/json')
    @HttpCode(HttpStatus.OK)
    async getParticipantJson() {
        return await this.authService.getParticipant()
    }
}
