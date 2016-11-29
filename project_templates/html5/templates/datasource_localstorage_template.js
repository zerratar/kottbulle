function storageAvailable(type) {
	try {
		var storage = window[type],
			x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	}
	catch(e) {
		return false;
	}
}

class $datasourceName$ {
    constructor() {
        if (!storageAvailable('localStorage')) {
            throw new Error("localStorage is unavailable. Please use a different datasource");
        }
        this.itemIndex = 0;           
        this.isDebug = $debug$;     
        this.storage = window['localStorage'];
    }
    static getInstance() {     
        if(!$instanceReference$ || $instanceReference$ === undefined || $instanceReference$ === null) { 
            $instanceReference$ = new $datasourceName$(); 
        } 
        return $instanceReference$;
    }
    store(item) {        
        if (this.isDebug === $debug$) {
            alert(item + " stored");
        }        
        this.storage.setItem(itemIndex++, item);
    }
    load(index) {
        return this.storage.getItem(index);
    }
}
