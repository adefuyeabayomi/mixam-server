import { locale } from '../types/locale';
/**
 * This function allows to calculate the time since an event occurred
 *
 * @param {number|Date} time - Refers to the time we want to calculate in milliseconds
 * @param {locale} local - It refers to a specific type of language, example spanish-es, english-en, Portuguese-pt
 * @returns {Promise} returns a promise with the elapsed time from the event date (time) to the current moment
 */
export declare const format: (time: number | Date, local: locale) => Promise<string>;
//# sourceMappingURL=format.d.ts.map