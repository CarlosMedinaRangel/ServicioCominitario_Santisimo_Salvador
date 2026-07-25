import 'multer';
import { Request } from 'express';

export const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) return callback(new Error('file is empty'), false);

  const ext = file.mimetype.split('/')[1];
  const valid = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

  callback(null, valid.includes(ext));
};
