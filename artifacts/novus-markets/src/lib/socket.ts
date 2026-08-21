import { io } from "socket.io-client";
import { apiUrl } from "../main";

const socketUrl = apiUrl.replace("/api", "");

export const socket = io(socketUrl, {
  withCredentials: true,
  autoConnect: false,
});
