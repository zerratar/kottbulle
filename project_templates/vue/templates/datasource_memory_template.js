export class $datasourceName$ {
  constructor () {
    this.itemIndex = 0
    this.items = []
    this.isDebug = true
  }

  static getInstance () {
    if(!$instanceReference$ || $instanceReference$ === undefined || $instanceReference$ === null) {
      $instanceReference$ = new $datasourceName$()
    }
    return $instanceReference$
  }

  store (item) {
    if (this.isDebug) {
      console.log(item + ' stored')
    }    
    return new Promise(function(resolve, reject) {
        try {          

          this.items.push(item);
          resolve(this.itemIndex++);
        } catch(e) {
          reject(Error(e));
        }
    });    
  }

  load (index) {    
    return new Promise(function(resolve, reject) {
        try {
          let item = this.items[index];          
          resolve(item);
        } catch(e) {
          reject(Error(e));
        }
    });
  }
}
