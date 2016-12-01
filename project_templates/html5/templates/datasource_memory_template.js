class $datasourceName$ {    
    constructor() {
        this.items   = [];
        this.isDebug = $debug$;
    }
    static getInstance() {     
        if(!$instanceReference$ || $instanceReference$ === undefined || $instanceReference$ === null) { 
            $instanceReference$ = new $datasourceName$(); 
        } 
        return $instanceReference$;
    }
    store(item) {
        if (this.isDebug) {
            alert(item + " stored");
        }
        this.items.push(item);
    }
    load(index) {
        return this.items[index];
    }
}
