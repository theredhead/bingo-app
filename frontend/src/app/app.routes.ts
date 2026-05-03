import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./features/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "host/:wordlistId",
    loadComponent: () =>
      import("./features/host-setup/host-setup.component").then(
        (m) => m.HostSetupComponent,
      ),
  },
  {
    path: "join/:joinCode",
    loadComponent: () =>
      import("./features/join/join.component").then((m) => m.JoinComponent),
  },
  {
    path: "games/:joinCode",
    loadComponent: () =>
      import("./features/game/game.component").then((m) => m.GameComponent),
  },
  {
    path: "card/:wordlistId",
    loadComponent: () =>
      import("./features/card/card.component").then((m) => m.CardComponent),
  },
  {
    path: "**",
    redirectTo: "",
  },
];
