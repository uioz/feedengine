import {
  InferAttributes,
  InferCreationAttributes,
  Model,
  ForeignKey,
  CreationOptional,
  Association,
  NonAttribute,
} from 'sequelize';
import type {PluginModel} from 'feedengine';
import {AtomAuthor, AtomCategory, AtomContributor, AtomContent, AtomLink} from '../types/index.js';

export class Atom extends Model<InferAttributes<Atom>, InferCreationAttributes<Atom>> {
  declare read: boolean;
  declare PluginId: ForeignKey<PluginModel['id']>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare uid: CreationOptional<string>;

  declare id: string;
  declare author: Array<AtomAuthor>;
  declare category: Array<AtomCategory>;
  declare contributor: Array<AtomContributor>;
  declare summary: string;
  declare lang: string;
  declare content: AtomContent;
  declare updated: Date;
  declare link: Array<AtomLink>;
  declare title: string;

  declare Plugin: NonAttribute<PluginModel>;

  declare static associations: {
    Plugin: Association<Atom, PluginModel>;
  };
}
