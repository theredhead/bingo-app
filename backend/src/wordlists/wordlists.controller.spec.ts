import { Test, TestingModule } from '@nestjs/testing';
import { WordlistsController } from './wordlists.controller';
import { WordlistsService } from './wordlists.service';
import { CreateWordlistDto } from './dto/create-wordlist.dto';
import { UpdateWordlistDto } from './dto/update-wordlist.dto';

// Mock the Keycloak module
jest.mock('@pafrtds/nest-keycloak-connect', () => ({
  AuthGuard: jest.fn().mockImplementation(() => jest.fn()),
  KeycloakConnectModule: { register: jest.fn() },
}));

describe('WordlistsController', () => {
  let controller: WordlistsController;
  let service: WordlistsService;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addWord: jest.fn(),
    removeWord: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WordlistsController],
      providers: [{ provide: WordlistsService, useValue: mockService }],
    }).compile();

    controller = module.get<WordlistsController>(WordlistsController);
    service = module.get<WordlistsService>(WordlistsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /api/wordlists', () => {
    it('should return array of wordlists', async () => {
      const wordlists = [{ id: '1', name: 'Test' }];
      mockService.findAll.mockResolvedValue(wordlists);
      expect(await controller.findAll()).toEqual(wordlists);
    });
  });

  describe('GET /api/wordlists/:id', () => {
    it('should return a wordlist', async () => {
      const wordlist = { id: '1', name: 'Test', words: [] };
      mockService.findOne.mockResolvedValue(wordlist);
      expect(await controller.findOne('1')).toEqual(wordlist);
    });
  });

  describe('POST /api/wordlists (Keycloak Protected)', () => {
    it('should create a wordlist', async () => {
      const dto: CreateWordlistDto = {
        name: 'Test',
        words: Array.from({ length: 24 }, (_, i) => ({ text: `Word${i}` })),
      };
      const created = { id: '1', ...dto, words: [] };
      mockService.create.mockResolvedValue(created);
      expect(await controller.create(dto)).toEqual(created);
    });
  });

  describe('PUT /api/wordlists/:id (Keycloak Protected)', () => {
    it('should update a wordlist', async () => {
      const dto: UpdateWordlistDto = { name: 'Updated' };
      const updated = { id: '1', name: 'Updated' };
      mockService.update.mockResolvedValue(updated);
      expect(await controller.update('1', dto)).toEqual(updated);
    });
  });

  describe('DELETE /api/wordlists/:id (Keycloak Protected)', () => {
    it('should remove a wordlist', async () => {
      mockService.remove.mockResolvedValue(undefined);
      await controller.remove('1');
      expect(mockService.remove).toHaveBeenCalledWith('1');
    });
  });

  describe('POST /api/wordlists/:id/words (Keycloak Protected)', () => {
    it('should add word to wordlist', async () => {
      const wordlist = { id: '1', words: [{ id: '99', text: 'NewWord' }] };
      mockService.addWord.mockResolvedValue(wordlist);
      const result = await controller.addWord('1', { text: 'NewWord' });
      expect(result.words).toContainEqual(expect.objectContaining({ text: 'NewWord' }));
    });
  });

  describe('DELETE /api/wordlists/:id/words/:wordId (Keycloak Protected)', () => {
    it('should remove word from wordlist', async () => {
      const wordlist = { id: '1', words: [] };
      mockService.removeWord.mockResolvedValue(wordlist);
      const result = await controller.removeWord('1', '99');
      expect(result.words).toHaveLength(0);
    });
  });
});
