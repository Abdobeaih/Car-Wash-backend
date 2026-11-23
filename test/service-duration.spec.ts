import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateServiceDto, UpdateServiceDto } from '../src/services/dto/service.dto';
describe('Service duration uses whole minutes', () => {
  it.each([15.5, 60.25])(
    'rejects fractional duration %s on create and update',
    async (duration) => {
      const create = plainToInstance(CreateServiceDto, {
        name: 'Test wash',
        description: 'A test service description',
        image: '/images/wash.svg',
        basePrice: 100,
        duration,
      });
      expect((await validate(create)).some((e) => e.property === 'duration')).toBe(true);
      expect(
        (await validate(plainToInstance(UpdateServiceDto, { duration }))).some(
          (e) => e.property === 'duration',
        ),
      ).toBe(true);
    },
  );
  it('accepts whole minutes including half-hour services', async () => {
    expect(await validate(plainToInstance(UpdateServiceDto, { duration: 90 }))).toHaveLength(0);
  });
});
