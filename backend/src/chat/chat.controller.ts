import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Sse,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { ChatService } from "./chat.service";

@Controller("api/chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("rooms")
  listRooms() {
    return this.chatService.listRooms();
  }

  @Post("rooms")
  createRoom(@Body() body: { name: string; from: string; connId: string }) {
    return this.chatService.createRoom(body.name, body.from, body.connId);
  }

  @Post("rooms/:roomId/join")
  joinRoom(
    @Param("roomId") roomId: string,
    @Body() body: { from: string; connId: string },
  ) {
    return this.chatService.joinRoom(roomId, body.from, body.connId);
  }

  @Post("rooms/:roomId/leave")
  @HttpCode(204)
  leaveRoom(@Param("roomId") roomId: string, @Body() body: { connId: string }) {
    this.chatService.leaveRoom(roomId, body.connId);
  }

  @Post("rooms/:roomId/messages")
  @HttpCode(204)
  sendMessage(
    @Param("roomId") roomId: string,
    @Body() body: { from: string; text: string },
  ) {
    this.chatService.sendMessage(roomId, body.from, body.text);
  }

  @Sse("rooms/:roomId/stream")
  stream(@Param("roomId") roomId: string): Observable<any> {
    return this.chatService.stream(roomId);
  }
}
