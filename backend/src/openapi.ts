const uuid={type:'string',format:'uuid'};
const text={type:'string'};
const integer={type:'integer'};
const date={type:'string',format:'date-time'};
const object=(properties:Record<string,unknown>,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const ref=(name:string)=>({$ref:`#/components/schemas/${name}`});
const schemas:Record<string,unknown>={
 Error:object({error:object({code:text,message:text,details:{type:'array',items:object({field:text,message:text})}},['code','message'])}),
 User:object({id:uuid,name:text,email:{type:'string',format:'email'},role:{type:'string',enum:['SAILOR','STAFF','ADMIN']},active:{type:'boolean'}}),
 Register:object({name:{type:'string',minLength:2,maxLength:100},email:{type:'string',format:'email'},password:{type:'string',minLength:10,maxLength:128}}),
 Login:object({email:{type:'string',format:'email'},password:{type:'string',minLength:10,maxLength:128}}),
 Session:object({user:ref('User'),csrfToken:text}),
 BoatInput:object({name:text,registration:text,length_cm:{...integer,minimum:10,maximum:10000},width_cm:{...integer,minimum:10,maximum:10000},draft_cm:{...integer,minimum:10,maximum:10000}}),
 BerthInput:object({code:text,max_length_cm:integer,max_width_cm:integer,max_draft_cm:integer,rate_cents:{...integer,minimum:100,maximum:1000000}}),
 ReservationInput:object({boat_id:uuid,berth_id:uuid,starts_at:date,ends_at:date}),
 FaultInput:object({berth_id:uuid,description:{type:'string',minLength:10,maxLength:2000},severity:{type:'string',enum:['MINOR','CRITICAL']}}),
 FaultUpdate:object({status:{type:'string',enum:['IN_PROGRESS','RESOLVED']},resolution:{type:'string',maxLength:2000}},['status']),
 BerthStatus:object({status:{type:'string',enum:['AVAILABLE','CLOSED']},reason:text},['status']),
 UserUpdate:object({role:{type:'string',enum:['SAILOR','STAFF','ADMIN']},active:{type:'boolean'}}),
 Boat:{allOf:[ref('BoatInput'),{type:'object',properties:{id:uuid,owner_id:uuid,archived:{type:'boolean'},created_at:date}}]},
 Berth:{allOf:[ref('BerthInput'),{type:'object',properties:{id:uuid,status:{type:'string',enum:['AVAILABLE','CLOSED']},closure_reason:text,archived:{type:'boolean'},quoted_cents:integer}}]},
 Reservation:object({id:uuid,user_id:uuid,boat_id:uuid,berth_id:uuid,starts_at:date,ends_at:date,status:{type:'string',enum:['CONFIRMED','CHECKED_IN','COMPLETED','CANCELLED']},rate_cents:integer,quoted_cents:integer,final_cents:{type:'integer',nullable:true},checked_in_at:{...date,nullable:true},checked_out_at:{...date,nullable:true},boat_name:text,berth_code:text,user_name:text,user_email:text,registration:text,berth_status:text,created_at:date}),
 Fault:{allOf:[ref('FaultInput'),{type:'object',properties:{id:uuid,reporter_id:uuid,status:text,resolution:text,berth_code:text,reporter_name:text,created_at:date}}]},
 Notification:object({id:uuid,user_id:uuid,message:text,read_at:{...date,nullable:true},created_at:date}),
 Event:object({id:{type:'string'},type:text,actor_id:uuid,actor_name:text,payload:{type:'object',additionalProperties:true},created_at:date}),
 Dashboard:object({available_berths:integer,upcoming:integer,checked_in:integer,open_faults:integer}),
};
const examples:Record<string,unknown>={Register:{name:'Jan Żeglarz',email:'jan@example.com',password:'BezpieczneHaslo123!'},Login:{email:'zeglarz@mazurport.local',password:'PortDemo123!'},BoatInput:{name:'Błękitna',registration:'POL-12345',length_cm:850,width_cm:280,draft_cm:140},BerthInput:{code:'A-09',max_length_cm:1100,max_width_cm:400,max_draft_cm:200,rate_cents:8500},ReservationInput:{boat_id:'11111111-1111-4111-8111-111111111111',berth_id:'22222222-2222-4222-8222-222222222222',starts_at:'2027-07-01T12:00:00+02:00',ends_at:'2027-07-03T12:00:00+02:00'},FaultInput:{berth_id:'22222222-2222-4222-8222-222222222222',description:'Uszkodzone gniazdo zasilania przy pomoście.',severity:'CRITICAL'},FaultUpdate:{status:'RESOLVED',resolution:'Wymieniono gniazdo i sprawdzono zasilanie.'},BerthStatus:{status:'CLOSED',reason:'Kontrola techniczna pomostu.'},UserUpdate:{role:'STAFF',active:true}};
const paths:Record<string,Record<string,unknown>>={};
type Endpoint={method:string;path:string;tag:string;summary:string;description?:string;input?:string;output?:string;list?:boolean;status?:number;public?:boolean;params?:unknown[]};
function endpoint(e:Endpoint){
 const parameters:any[]=[...(e.params??[])];
 if(e.path.includes('{id}'))parameters.push({in:'path',name:'id',required:true,schema:uuid,description:'UUID zasobu.'});
 if(!e.public&&!['get','head'].includes(e.method))parameters.push({in:'header',name:'X-CSRF-Token',required:true,schema:text,description:'csrfToken z /auth/login, /auth/register lub /auth/me.'});
 if(e.list)parameters.push(...[{name:'page',schema:{...integer,minimum:1,default:1}},{name:'limit',schema:{...integer,minimum:1,maximum:100,default:20}},{name:'search',schema:text},{name:'status',schema:text},{name:'sort',schema:{type:'string',enum:['newest','oldest','name'],default:'newest'}}].map(p=>({in:'query',...p})));
 const success=e.output?(e.list?object({data:{type:'array',items:ref(e.output)},total:integer,page:integer,limit:integer}):ref(e.output)):undefined;
 const responses:Record<string,unknown>={[e.status??200]:{description:e.status===204?'Operacja wykonana, bez body.':'Operacja wykonana.',...(success?{content:{'application/json':{schema:success}}}:{})}};
 for(const [code,description] of Object.entries({400:'Niepoprawny JSON.',401:'Brak aktywnej sesji lub nieprawidłowe dane logowania.',403:'Niewystarczająca rola, niepoprawny CSRF lub Origin.',404:'Nie znaleziono zasobu (także cudzej własności).',409:'Konflikt, zajęty termin lub niedozwolona zmiana stanu.',422:'Nieprawidłowe dane lub naruszona reguła biznesowa.',429:'Limit prób logowania/rejestracji.',500:'Błąd serwera.'}))responses[code]={description,content:{'application/json':{schema:ref('Error'),example:{error:{code:code==='409'?'CONFLICT':'ERROR',message:description}}}}};
 paths[e.path]??={};paths[e.path]![e.method]={tags:[e.tag],summary:e.summary,description:e.description,operationId:e.method+e.path.replace(/[^a-zA-Z]/g,'_'),security:e.public?[]:[{sessionCookie:[]}],parameters,responses,...(e.input?{requestBody:{required:true,content:{'application/json':{schema:ref(e.input),example:examples[e.input]}}}}:{})};
}
endpoint({method:'get',path:'/health',tag:'System',summary:'Gotowość API i połączenia z PostgreSQL',public:true});
endpoint({method:'post',path:'/auth/register',tag:'Konto',summary:'Rejestracja żeglarza',input:'Register',output:'Session',status:201,public:true});
endpoint({method:'post',path:'/auth/login',tag:'Konto',summary:'Logowanie i utworzenie sesji na 7 dni',input:'Login',output:'Session',public:true});
endpoint({method:'get',path:'/auth/me',tag:'Konto',summary:'Bieżący użytkownik i token CSRF',output:'Session'});
endpoint({method:'post',path:'/auth/logout',tag:'Konto',summary:'Unieważnienie bieżącej sesji',status:204});
endpoint({method:'get',path:'/dashboard',tag:'Port',summary:'Statystyki własne żeglarza lub całego portu dla obsługi',output:'Dashboard'});
for(const [resource,input,output,tag] of [['boats','BoatInput','Boat','Jachty'],['berths','BerthInput','Berth','Miejsca']]){
 endpoint({method:'get',path:`/${resource}`,tag:tag!,summary:resource==='boats'?'Lista własnych jachtów':'Lista miejsc portowych',output,list:true});
 endpoint({method:'get',path:`/${resource}/{id}`,tag:tag!,summary:'Szczegóły zasobu',output});
 endpoint({method:'post',path:`/${resource}`,tag:tag!,summary:resource==='boats'?'Dodanie własnego jachtu':'Dodanie miejsca (ADMIN)',input,output,status:201});
 endpoint({method:'put',path:`/${resource}/{id}`,tag:tag!,summary:resource==='boats'?'Edycja własnego jachtu':'Edycja miejsca (ADMIN)',input,output,description:'Zmiana wymiarów jest zablokowana przy aktywnych rezerwacjach. Stawka miejsca nie zmienia istniejących rezerwacji.'});
 endpoint({method:'delete',path:`/${resource}/{id}`,tag:tag!,summary:resource==='boats'?'Archiwizacja własnego jachtu':'Archiwizacja miejsca (ADMIN)',status:204,description:'Nie usuwa historii. Aktywne rezerwacje blokują operację.'});
}
endpoint({method:'patch',path:'/berths/{id}/status',tag:'Miejsca',summary:'Otwarcie lub zamknięcie miejsca (STAFF, ADMIN)',input:'BerthStatus',output:'Berth',description:'Zamknięcie blokuje nowe rezerwacje i check-in. Nie anuluje istniejących rezerwacji. Otwarcie wymaga rozwiązania wszystkich krytycznych usterek.'});
endpoint({method:'get',path:'/availability',tag:'Rezerwacje',summary:'Wolne miejsca dopasowane do własnego jachtu',description:'Odpowiedź {data: Berth[]} zawiera quoted_cents. Okres [starts_at, ends_at), minimum godzina, maksimum 30 dni, start w przyszłości.',params:[{in:'query',name:'boat_id',required:true,schema:uuid},{in:'query',name:'starts_at',required:true,schema:date},{in:'query',name:'ends_at',required:true,schema:date}]});
endpoint({method:'get',path:'/reservations',tag:'Rezerwacje',summary:'Własne rezerwacje lub wszystkie dla obsługi',output:'Reservation',list:true});
endpoint({method:'get',path:'/reservations/{id}',tag:'Rezerwacje',summary:'Szczegóły rezerwacji i rozliczenie',output:'Reservation'});
endpoint({method:'post',path:'/reservations',tag:'Rezerwacje',summary:'Rezerwacja miejsca dla własnego jachtu',input:'ReservationInput',output:'Reservation',status:201,description:'Ochrona przed nakładaniem terminów miejsca i jachtu. Koszt w groszach: rozpoczęte doby × stawka zapisana przy rezerwacji.'});
for(const [action,summary] of [['cancel','Anulowanie przed rozpoczęciem; obsługa także po rozpoczęciu'],['check-in','Zameldowanie w okresie rezerwacji (STAFF, ADMIN)'],['check-out','Wymeldowanie i rozliczenie (STAFF, ADMIN)']])endpoint({method:'post',path:`/reservations/{id}/${action}`,tag:'Rezerwacje',summary:summary!,output:'Reservation',description:'Operacja wymaga właściwego stanu rezerwacji. Wcześniejszy wyjazd nie obniża kosztu, przekroczenie terminu nalicza kolejne rozpoczęte doby.'});
endpoint({method:'get',path:'/faults',tag:'Usterki',summary:'Własne zgłoszenia lub wszystkie dla obsługi',output:'Fault',list:true});
endpoint({method:'post',path:'/faults',tag:'Usterki',summary:'Zgłoszenie usterki; krytyczna automatycznie zamyka miejsce',input:'FaultInput',output:'Fault',status:201});
endpoint({method:'patch',path:'/faults/{id}',tag:'Usterki',summary:'Obsługa usterki (STAFF, ADMIN)',input:'FaultUpdate',output:'Fault',description:'Rozwiązanie wymaga opisu. Po naprawie miejsce należy otworzyć osobno.'});
endpoint({method:'get',path:'/users',tag:'Administracja',summary:'Lista użytkowników (ADMIN)',output:'User',list:true});
endpoint({method:'patch',path:'/users/{id}',tag:'Administracja',summary:'Zmiana roli lub aktywności konta (ADMIN)',input:'UserUpdate',output:'User',description:'Unieważnia sesje zmienianego konta. Nie można zmieniać własnych uprawnień ani wyłączyć ostatniego administratora.'});
endpoint({method:'get',path:'/notifications',tag:'Zdarzenia',summary:'Powiadomienia bieżącego użytkownika',output:'Notification',list:true});
endpoint({method:'patch',path:'/notifications/{id}/read',tag:'Zdarzenia',summary:'Oznaczenie własnego powiadomienia jako przeczytane',output:'Notification'});
endpoint({method:'get',path:'/activity',tag:'Zdarzenia',summary:'Asynchroniczny dziennik zdarzeń (STAFF, ADMIN)',output:'Event',list:true});
export const openapi={openapi:'3.0.3',info:{title:'MazurPort API',version:'1.0.0',description:'System zarządzania mariną. Wymiary w cm, pieniądze w groszach, daty ISO 8601 ze strefą. Najpierw wykonaj login, następnie w żądaniach zmieniających dane wpisz csrfToken w X-CSRF-Token. Przeglądarka przesyła HttpOnly cookie automatycznie. Nie ma płatności online.'},servers:[{url:'/api'}],paths,components:{schemas,securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'mazurport_session'}}}};
