function storageAvailable (type) {
  try {
    let storage = window[type]
    let x = '__storage_test__'
    storage.setItem(x, x)
    storage.removeItem(x)
    return true
  } catch (e) {
    return false
  }
}

export class $datasourceName$ {
  constructor () {
    if (!storageAvailable('localStorage')) {
      throw new Error('localStorage is unavailable. Please use a different datasource')
    }
    this.itemIndex = 0
    this.isDebug = true
    this.storage = window['localStorage']
  }

  static getInstance () {
    if (!$instanceReference$ || $instanceReference$ === undefined || $instanceReference$ === null) {
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
          this.storage.setItem(this.itemIndex, item);
          resolve(this.itemIndex++);
        } catch(e) {
          reject(Error(e));
        }
    });
  }

  load (index) {    
    return new Promise(function(resolve, reject) {
        try {
          let item = this.storage.getItem(index);          
          resolve(item);
        } catch(e) {
          reject(Error(e));
        }
    });
  }
}

