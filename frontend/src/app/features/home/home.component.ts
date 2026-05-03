import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { Wordlist } from "../../core/models";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent implements OnInit {
  private apiService = inject(ApiService);
  private router = inject(Router);

  readonly wordlists = signal<Wordlist[]>([]);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly joinError = signal("");
  joinCode = "";

  ngOnInit() {
    this.loadWordlists();
  }

  loadWordlists() {
    this.loading.set(true);
    this.error.set("");
    this.apiService.getWordlists().subscribe({
      next: (wordlists) => {
        this.wordlists.set(wordlists);
        this.loading.set(false);
      },
      error: () => {
        this.wordlists.set([]);
        this.error.set("Could not load wordlists. Please try again.");
        this.loading.set(false);
      },
    });
  }

  hostGame(wordlistId: string) {
    this.router.navigate(["/bingo/host", wordlistId]);
  }

  joinExistingGame() {
    const code = this.joinCode.trim().toUpperCase();
    if (!code) {
      this.joinError.set("Enter a join code.");
      return;
    }

    this.joinError.set("");
    this.router.navigate(["/bingo/join", code]);
  }
}
