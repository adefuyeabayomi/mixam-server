# js-time-ago

[![npm version](https://img.shields.io/npm/v/js-time-ago.svg?style=flat-square)](https://www.npmjs.com/package/js-time-ago)
[![npm downloads](https://img.shields.io/npm/dw/js-time-ago.svg?style=flat-square)](https://www.npmjs.com/package/js-time-ago)

Easily determine how long ago an event occurred, only for past dates


you will get a result like this:

**English**

- _right now_
- _10 seconds ago_
- _1 minute ago_
- _1 hour ago_
- _1 day ago_
- _1 week ago_
- _1 month ago_
- _1 year ago_

**Spanish**

- _Justo ahora_
- _Hace 10 segundos_
- _Hace 1 minuto_
- _Hace 1 hora_
- _Hace 1 dia_
- _Hace 1 semana_
- _Hace 1 mes_
- _Hace 1 año_

**Portuguese**

- _justo agora_
- _10 segundos atrás_
- _1 minuto atrás_
- _1 hora atrás_
- _1 dia atrás_
- _1 semana atrás_
- _1 mês atrás_
- _Há 1 ano_


## Installation 🔧

This package is available through [npm registration](https://www.npmjs.com/).

```
npm install js-time-ago
npm i js-time-ago
```


## Usage 🚀

```js

const { format } = require('js-time-ago');
//  or  //
import { format } from 'js-time-ago';

// we specify the date and the language in which we will receive the answer

format( Date.now(), 'en' )
    .then( console.log );
    // right now

// support async / await
(async () => {

    const response = await format( Date.now() - 60 * 1000, 'es' );
    console.log( response );
    // Hace 1 minuto

})();


const getTime =  async (time, local) => {
    const response = await format( time, local ); 
    console.log( response );
    // Há 1 ano
};

getTime( Date.now() -  365 * 24 * 60 * 60 * 1000, 'pt' );

// use with angular pipe

import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'js-time-ago';

@Pipe({
    name: 'jstimeago'
})

export class JsTimeAgoPipe implements PipeTransform {

    async transform(date: number | Date): Promise<string> {
        return await format( date, 'es' );
    }
}

// import pipe in declarations and use it in html component
<span>{{ date | jstimeago | async }}</span>


```

## Local

Currently there is support for three languages:
- en - English
- es - Spanish
- pt - Portuguese



## License 📄

  [MIT](LICENSE)