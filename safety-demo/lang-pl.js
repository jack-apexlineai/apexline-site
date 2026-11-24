/* Demo language pack: Polish, for one procedure only (SWP-014 Isolating the baler).
   Same shape as the English data in store.js, plus the few screen words around it.
   Machine names (Baler 1) stay as they are on the site labels. */
(function(root){
'use strict';
var PL = {
  code: 'pl', name: 'Polski', ttsLang: 'pl-PL',
  swp: {
    lototo: {
      title: 'Izolacja prasy belującej',
      sub: 'Zablokuj, oznacz, sprawdź',
      steps: [
        { t: 'Powiadom ludzi', s: 'Powiedz wszystkim, którzy pracują przy prasie lub w jej pobliżu, że zamierzasz ją odizolować. Powiedz operatorowi ładowarki, żeby przestał podawać do niej materiał.' },
        { t: 'Zatrzymaj maszynę', s: 'Zatrzymaj prasę na panelu sterowania zwykłym przyciskiem stop. Poczekaj, aż tłok przestanie się ruszać.' },
        { t: 'Odizoluj', s: 'Podejdź do głównego wyłącznika izolującego prasy i ustaw go w pozycji wyłączonej.' },
        { t: 'Twoja kłódka i zawieszka', s: 'Załóż własną kłódkę na wyłącznik, a do niej własną zawieszkę ze swoim imieniem, nazwiskiem i datą. Jedna osoba, jedna kłódka. Nigdy nie używaj cudzej kłódki.' },
        { t: 'Uwolnij zgromadzoną energię', s: 'Zrzuć ciśnienie hydrauliczne zaworem upustowym i sprawdź, czy manometr wskazuje zero. Potem opuść albo zablokuj tłok i płytę dociskową, żeby nic nie mogło spaść ani się poruszyć.' },
        { t: 'Próba uruchomienia', s: 'Spróbuj uruchomić prasę. Nic nie powinno się stać. Sprawdź manometr jeszcze raz, żeby mieć pewność, że w maszynie nie ma energii. Potem przestaw przełącznik startu z powrotem na wyłączony.' },
        { t: 'Wykonaj pracę', s: 'Teraz wykonaj pracę. Jeśli odchodzisz od maszyny, twoja kłódka zostaje na miejscu.' },
        { t: 'Tylko ty zdejmujesz swoją kłódkę', s: 'Kiedy skończysz, sam zdejmujesz swoją kłódkę. Nikt inny nie może tego zrobić. Nigdy nie zdejmuj cudzej kłódki. Jeśli czyjaś kłódka została na wyłączniku, powiedz przełożonemu.' },
        { t: 'Powrót do pracy', s: 'Załóż i zamknij osłony. Upewnij się, że narzędzia i ludzie są z dala od maszyny. Powiedz wszystkim, że prasa rusza, a potem, przed użyciem, wykonaj kontrolę przed zmianą.' }
      ],
      quiz: [
        { q: 'Kto może zdjąć twoją kłódkę?', say: 'Kto może zdjąć twoją kłódkę? Dotknij obrazka.', why: 'Kłódkę może zdjąć tylko osoba, która ją założyła. Dzięki temu nikt nie włączy maszyny, kiedy ktoś przy niej pracuje.', a: ['Tylko ja', 'Mój przełożony', 'Każdy'] },
        { q: 'Kłódka założona. Co dalej?', say: 'Twoja kłódka jest założona. Co robisz dalej? Dotknij obrazka.', a: ['Zacznij pracę', 'Spróbuj uruchomić', 'Odejdź'] }
      ]
    }
  },
  ui: {
    step: 'Krok',
    repeat: 'Powtórz', next: 'Dalej', finish: 'Zakończ',
    quick: 'Szybki test',
    notQuite: 'Nie do końca. Posłuchaj tego kroku jeszcze raz',
    notQuiteSay: 'Nie do końca. Posłuchaj jeszcze raz.',
    honest: 'Podpis pokazuje, że ktoś dostał instrukcję. Pytanie z obrazkami pokazuje, że ją zrozumiał.',
    understand: 'Czy rozumiesz?',
    understandSay: 'Czy rozumiesz tę procedurę? Jeśli tak, dotknij dużego pola, żeby podpisać. Jeśli nie, odtwórz ją jeszcze raz albo zapytaj przełożonego.',
    understandTalk: 'Czy rozumiesz tę procedurę? Jeśli tak, dotknij dużego pola, żeby podpisać.',
    quizOk: function(r, of, tries){ return 'Poprawne odpowiedzi: ' + r + ' z ' + of + (tries > 1 ? ', po ponownym wysłuchaniu' : ', za pierwszym razem'); },
    iUnderstand: 'Rozumiem', tapToSign: 'Dotknij, żeby podpisać', signed: 'Podpisano',
    sigToggle: 'Dodaj podpis palcem', optional: '(opcjonalnie)', sigHint: 'Podpisz się tutaj palcem', clear: 'Wyczyść',
    again: 'Odtwórz jeszcze raz od początku',
    doneTitle: 'Podpisano', doneMeta: 'Rozumiesz procedurę', more: 'Więcej', home: 'Ekran główny',
    doneSay: 'Dziękuję. Procedura została podpisana.',
    lockTap: function(m){ return 'Dotknij, gdy założysz kłódkę na ' + m; },
    lockOn: function(m){ return 'Twoja kłódka jest założona na ' + m; },
    lockSay: 'Twoja kłódka jest założona. Biuro to widzi.',
    noAuth: function(m){ return 'Nie możesz izolować maszyny ' + m; },
    noAuthWhy: function(m, noTraining){ return (noTraining ? 'Nie masz jeszcze szkolenia z izolacji LOTOTO. ' : '') + 'Nie jesteś na liście osób upoważnionych do izolacji maszyny ' + m + '.'; },
    noAuthLearn: 'Posłuchaj i naucz się kroków, ale izolację wykonuje osoba upoważniona.',
    switched: 'Język polski.'
  }
};
if (typeof module !== 'undefined' && module.exports) module.exports = PL;
else root.CS_PL = PL;
})(this);
