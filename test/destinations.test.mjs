import test from 'node:test';
import assert from 'node:assert/strict';
import {Destinations} from '../src/destinations.mjs';
import {destinationDisplay} from '../public/destination-data.js';
function store(){let saved;return {load:(_key,defaults)=>structuredClone(saved??defaults),save:(_key,data)=>{saved=structuredClone(data);}};}
test('local names and phone formatting survive restart, without touching other destinations',()=>{
 const storage=store(),book=new Destinations(storage);const old=book.view();
 const entry={...old.entries[0],name:'Ny ort',phone:'+46 (0) 70-123'};
 const result=book.save({revision:0,entry});assert.equal(result.entries[0].phone,entry.phone);assert.deepEqual(result.entries.slice(1),old.entries.slice(1));assert.deepEqual(new Destinations(storage).view(),result);
 assert.throws(()=>book.save({revision:0,entry}),/ändrats/);
 assert.throws(()=>book.save({revision:1,entry:{...entry,phone:'<script>'}}),/giltigt/);
});
test('explicit station binding updates names, keeps local phone, and makes stale or missing data explicit',()=>{
 const book=new Destinations(store());const entry={...book.view().entries[0],source:'trainmeet',stationId:'s1'};
 assert.throws(()=>book.save({revision:0,entry},[]),/finns inte/);
 book.save({revision:0,entry},[{id:'s1',name:'Nytt namn'}]);
 const trainMeet={stale:false,context:{stations:[{id:'s1',name:'Nytt namn'}]}};
 assert.equal(destinationDisplay(entry,trainMeet).name,'Nytt namn');assert.equal(destinationDisplay(entry,trainMeet).phone,'72');
 trainMeet.context.stations[0].name='Uppdaterat';assert.equal(destinationDisplay(entry,trainMeet).name,'Uppdaterat');
 assert.match(destinationDisplay(entry,{...trainMeet,stale:true}).sourceLabel,/senaste/);
 assert.equal(destinationDisplay(entry,null).name,'Lekby');assert.match(destinationDisplay(entry,null).sourceLabel,/reservnamn/);
 assert.equal(destinationDisplay({...entry,source:'local'},trainMeet).name,'Lekby');
});
test('failed storage cannot change displayed destination settings',()=>{
 const storage=store(),book=new Destinations(storage),old=book.view();storage.save=()=>{throw Error('disk');};
 assert.throws(()=>book.save({revision:0,entry:{...old.entries[0],phone:''}}),/disk/);assert.deepEqual(book.view(),old);
});
