import {InferAttributes, InferCreationAttributes, Model} from 'sequelize';

export class Author extends Model<InferAttributes<Author>, InferCreationAttributes<Author>> {
  declare uri: string | null;
  declare name: string;
  declare email: string | null;
}
