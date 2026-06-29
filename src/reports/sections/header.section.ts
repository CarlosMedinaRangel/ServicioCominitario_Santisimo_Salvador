
import { DateFormatter } from 'src/helpers/date-formatter';
import { Content } from 'src/interfaces/pdfmake.interface';

interface HeaderOptions {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  ShowDate?: boolean;
}

const logo: Content = {
  image: 'src/assets/LogoSantisimoSalvador.png',
  width: 100,
  height: 100,
  alignment: 'center',
  margin: [0, 0, 0, 20],
};

export const headerSection = (options: HeaderOptions): Content => {
  const { ShowDate = true, showLogo = true, subtitle, title } = options;

  const headerLogo: Content = showLogo ? logo : '';
  const headerDate: Content = ShowDate
    ? {
        text: DateFormatter.getDDMMMMYYYY(new Date()),
        alignment: 'right',
        margin: [0, 20, 0, 20],
      }
    : '';
  return {
    columns: [headerLogo, headerDate],
  };
};
