import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/landing/landing.component").then(
        (m) => m.LandingComponent,
      ),
  },
  // Bingo routes under /bingo
  {
    path: "bingo",
    loadComponent: () =>
      import("./features/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "bingo/host/:wordlistId",
    loadComponent: () =>
      import("./features/host-setup/host-setup.component").then(
        (m) => m.HostSetupComponent,
      ),
  },
  {
    path: "bingo/join/:joinCode",
    loadComponent: () =>
      import("./features/join/join.component").then((m) => m.JoinComponent),
  },
  {
    path: "bingo/games/:joinCode",
    loadComponent: () =>
      import("./features/game/game.component").then((m) => m.GameComponent),
  },
  {
    path: "bingo/card/:wordlistId",
    loadComponent: () =>
      import("./features/card/card.component").then((m) => m.CardComponent),
  },
  // Chat
  {
    path: "chat",
    loadComponent: () =>
      import("./features/chat/chat.component").then((m) => m.ChatComponent),
  },
  {
    path: "chat/:roomId",
    loadComponent: () =>
      import("./features/chat/chat.component").then((m) => m.ChatComponent),
  },
  // Texas Hold'em placeholder
  {
    path: "holdem",
    loadComponent: () =>
      import("./features/holdem/holdem.component").then(
        (m) => m.HoldemComponent,
      ),
  },
  {
    path: "holdem/table/:gameId",
    loadComponent: () =>
      import("./features/holdem/holdem.component").then(
        (m) => m.HoldemComponent,
      ),
  },
  {
    path: "**",
    redirectTo: "",
  },
];
