import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WordlistsService } from './wordlists.service';
import { Wordlist } from './entities/wordlist.entity';
import { Word } from './entities/word.entity';
import { CreateWordlistDto } from './dto/create-wordlist.dto';
import { UpdateWordlistDto } from './dto/update-wordlist.dto';
import { NotFoundException } from '@nestjs/common';

describe('WordlistsService', () => {
  let service: WordlistsService;
  let wordlistRepo: Repository<Wordlist>;
  let wordRepo: Repository<Word>;

  const mockWordlistRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockWordRepo = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordlistsService,
        { provide: getRepositoryToken(Wordlist), useValue: mockWordlistRepo },
        { provide: getRepositoryToken(Word), useValue: mockWordRepo },
      ],
    }).compile();

    service = module.get<WordlistsService>(WordlistsService);
    wordlistRepo = module.get<Repository<Wordlist>>(getRepositoryToken(Wordlist));
    wordRepo = module.get<Repository<Word>>(getRepositoryToken(Word));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of wordlists', async () => {
      const wordlists = [{ id: '1', name: 'Test' }];
      mockWordlistRepo.find.mockResolvedValue(wordlists);
      expect(await service.findAll()).toEqual(wordlists);
    });
  });

  describe('findOne', () => {
    it('should return a wordlist with words', async () => {
      const wordlist = { id: '1', name: 'Test', words: [] };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);
      expect(await service.findOne('1')).toEqual(wordlist);
    });

    it('should throw NotFoundException if wordlist not found', async () => {
      mockWordlistRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create and return a wordlist', async () => {
      const dto: CreateWordlistDto = {
        name: 'Test',
        description: 'Desc',
        words: [
          { text: 'Word1' },
          { text: 'Word2' },
        ].concat(Array.from({ length: 22 }, (_, i) => ({ text: `Word${i + 3}` }))),
      };
      const saved = { id: '1', name: 'Test', description: 'Desc', words: [] };
      mockWordlistRepo.create.mockReturnValue(saved);
      mockWordlistRepo.save.mockResolvedValue(saved);
      mockWordlistRepo.findOne.mockResolvedValue(saved);
      const result = await service.create(dto);
      expect(result).toEqual(saved);
      expect(mockWordlistRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return the wordlist', async () => {
      const existing = { id: '1', name: 'Old', words: [] };
      const dto: UpdateWordlistDto = { name: 'New' };
      mockWordlistRepo.findOne.mockResolvedValue(existing);
      mockWordlistRepo.save.mockResolvedValue({ ...existing, ...dto });
      expect(await service.update('1', dto)).toEqual({ ...existing, ...dto });
    });
  });

  describe('remove', () => {
    it('should delete the wordlist', async () => {
      mockWordlistRepo.delete.mockResolvedValue({ affected: 1 });
      await service.remove('1');
      expect(mockWordlistRepo.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('addWord', () => {
    it('should add word to wordlist', async () => {
      const wordlist = { id: '1', words: [{ id: '99', text: 'NewWord', wordlistId: '1' }] };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);
      mockWordRepo.create.mockReturnValue({ text: 'NewWord' });
      mockWordRepo.save.mockResolvedValue({ id: '99', text: 'NewWord', wordlistId: '1' });
      const result = await service.addWord('1', { text: 'NewWord' });
      expect(mockWordRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('removeWord', () => {
    it('should remove word from wordlist', async () => {
      const wordlist = { id: '1', words: [{ id: '99', text: 'Word' }] };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);
      mockWordRepo.delete.mockResolvedValue({ affected: 1 });
      await service.removeWord('1', '99');
      expect(mockWordRepo.delete).toHaveBeenCalledWith('99');
    });
  });
});
