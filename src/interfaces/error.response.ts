export interface IErrorsTypeORM {
  length: number;
  severity: string;
  code: string;
  detail: string;
  hint: string;
  position: string;
  internalPosition: string;
  internalQuery: string;
  where: string;
  schema: string;
  table: string;
  column: string;
  dataType: string;
  constraint: string;
  file: string;
  line: string;
  routine: string;
  driverError: IDriverError;
}

export interface IDriverError {
  length: number;
  severity: string;
  code: string;
  detail: string;
  hint: string;
  position: string;
  internalPosition: string;
  internalQuery: string;
  where: string;
  schema: string;
  table: string;
  column: string;
  dataType: string;
  constraint: string;
}
