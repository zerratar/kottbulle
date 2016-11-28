class $datasourceName$ {
    constructor() {
        this.items = [];
    }
    static getInstance() {     
        if(!$instanceReference$ || $instanceReference$ === undefined || $instanceReference$ === null) { 
            $instanceReference$ = new $datasourceName$(); 
        } 
        return $instanceReference$;
    }
    store(item) {
        this.items.push(item);
    }
    load(index) {
        return this.items[index];
    }
}
