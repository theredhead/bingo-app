import { GameEventsService } from "./game-events.service";

describe("GameEventsService", () => {
  class FakeEventSource {
    static instances: FakeEventSource[] = [];

    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    closed = false;

    constructor(readonly url: string) {
      FakeEventSource.instances.push(this);
    }

    close(): void {
      this.closed = true;
    }
  }

  let service: GameEventsService;

  beforeEach(() => {
    vi.useFakeTimers();
    FakeEventSource.instances = [];
    vi.stubGlobal(
      "EventSource",
      FakeEventSource as unknown as typeof EventSource,
    );
    service = new GameEventsService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("emits parsed snapshots from SSE messages", () => {
    const snapshots: Array<{ playerId?: string }> = [];

    service.watchGame("ABCD", "player-1").subscribe((snapshot) => {
      snapshots.push(snapshot);
    });

    FakeEventSource.instances[0].onmessage?.({
      data: JSON.stringify({ playerId: "player-1" }),
    } as MessageEvent<string>);

    expect(FakeEventSource.instances[0].url).toContain(
      "/api/games/ABCD/events",
    );
    expect(snapshots).toEqual([{ playerId: "player-1" }]);
  });

  it("reconnects after an SSE error", () => {
    const snapshots: Array<{ playerId?: string }> = [];

    service.watchGame("ABCD", "player-1").subscribe((snapshot) => {
      snapshots.push(snapshot);
    });

    FakeEventSource.instances[0].onerror?.(new Event("error"));
    expect(FakeEventSource.instances[0].closed).toBe(true);

    vi.advanceTimersByTime(2000);

    expect(FakeEventSource.instances).toHaveLength(2);

    FakeEventSource.instances[1].onmessage?.({
      data: JSON.stringify({ playerId: "player-1" }),
    } as MessageEvent<string>);

    expect(snapshots).toEqual([{ playerId: "player-1" }]);
  });
});
