# Arnia 🐝

**Arnia** è un gestionale open-source per associazioni non-profit e realtà simili:
magazzino, eventi/attività e finanze — comprese le fatture con QR-bill svizzero — in un unico
strumento pensato prima di tutto per il telefono.

> **Stato del progetto:** in sviluppo attivo. Vedi [`docs/PLAN.md`](docs/PLAN.md) (in inglese)
> per il piano di sviluppo a fasi e lo stato di avanzamento. Non ancora pronto per la
> produzione.

[English](README.md)

## Disclaimer

Arnia viene fornita "così com'è", senza garanzie di alcun tipo. Non costituisce **consulenza
legale, fiscale o contabile**. Chi installa e gestisce un'istanza di Arnia è l'unico
responsabile dell'uso che ne viene fatto, dei dati che contiene, e del rispetto di qualsiasi
obbligo — legale, fiscale, sulla protezione dei dati o di altro tipo — applicabile nella propria
giurisdizione. Arnia non dichiara la conformità a nessuna legge o normativa specifica.

## Funzionalità (obiettivo del progetto)

- **Magazzino** — articoli, categorie, ubicazioni di stoccaggio gerarchiche, scansione di
  codici a barre/QR, un registro dei movimenti di magazzino, costo medio ponderato per i
  materiali di consumo, tracciamento delle condizioni delle attrezzature, avvisi di scorta
  minima, importazione/esportazione CSV.
- **Eventi / attività** (l'etichetta è configurabile) — pianificazione, budget vs consuntivo,
  prenotazione del materiale con rilevamento dei conflitti, checklist, ruoli di squadra
  specifici per evento, chiusura di un evento con generazione del bilancio in PDF.
- **Finanze** — conti, transazioni categorizzate, rimborsi spese con foto della ricevuta e
  flusso di approvazione, anni fiscali, registro delle modifiche, report per evento e annuali
  (PDF/CSV).
- **Contatti e fatture** — numerazione sequenziale delle fatture, righe di dettaglio, e
  generazione della **polizza QR svizzera** (riferimenti QRR/SCOR, rilevamento IBAN QR) secondo
  le linee guida SIX in vigore, con funzionamento anche fuori dalla Svizzera (senza la parte di
  pagamento).
- **Notifiche** — un centro notifiche in-app è il canale principale, con digest email opzionali.
- **Casella email con regole** — inoltra ricevute e corrispondenza a una casella dedicata;
  regole configurabili possono taggare, collegare a un evento o creare automaticamente una
  bozza di spesa.
- **PWA installabile** — funziona offline per gli ultimi dati consultati; le nuove spese e i
  movimenti di magazzino creati offline si sincronizzano al ritorno della connessione.
- **Dati sotto il tuo controllo** — nessun CDN, font o servizio di analisi esterno. I dati
  stanno nel tuo cluster MongoDB Atlas e le foto nel tuo bucket privato Cloudflare R2; le email
  passano da [Resend](https://resend.com) o da un tuo server SMTP.

## Avvio rapido

Si pubblica su Vercel con un database MongoDB Atlas: vedi
[`docs/deploy-vercel.md`](docs/deploy-vercel.md) e, per le foto, [`docs/storage-r2.md`](docs/storage-r2.md)
(in inglese). Il [`README.md`](README.md) copre sviluppo locale, email, backup e installazione
della PWA.

## Licenza

[AGPL-3.0](LICENSE).
