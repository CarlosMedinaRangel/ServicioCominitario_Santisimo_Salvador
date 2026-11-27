
import { DateFormatter } from 'src/helpers/date-formatter';
import { Content } from 'src/interfaces/pdfmake.interface';

interface HeaderOptions {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  ShowDate?: boolean;
  date?: Date | string;
  city?: string;
  horizontalMargin?: number;
}

const logo: Content = {
  image: 'src/assets/LogoSantisimoSalvador.png',
  width: 85,
  height: 85,
  alignment: 'left',
  margin: [0, 0, 0, 10],
};

export const headerSection = (options: HeaderOptions): Content => {
  const {
    ShowDate = true,
    showLogo = true,
    date,
    city,
    horizontalMargin = 50,
  } = options;

  const targetDate = date ? new Date(date) : new Date();
  const dateString = DateFormatter.getDDMMMMYYYY(targetDate);

  const headerLogo: Content = showLogo ? logo : '';
  const headerDate: Content = ShowDate
    ? {
        text: city ? `${city}, ${dateString}` : dateString,
        alignment: 'right',
        fontSize: 10,
        color: '#334155',
        margin: [0, 10, 0, 0],
      }
    : '';
  return {
    columns: [headerLogo, headerDate],
    margin: [horizontalMargin, 15, horizontalMargin, 0],
  };
};
