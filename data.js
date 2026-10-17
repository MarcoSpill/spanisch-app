// Lerninhalte (kastilisches Spanisch, ca. B1). w = Wörter [es, de], s = Sätze [es mit [Lücke], de]
const TOPICS = [
  {
    id: "familia", icon: "👨‍👩‍👧", title: "Familie & Schwiegereltern",
    w: [
      ["el suegro", "der Schwiegervater"], ["la suegra", "die Schwiegermutter"], ["el yerno", "der Schwiegersohn"],
      ["la nuera", "die Schwiegertochter"], ["el cuñado", "der Schwager"], ["la cuñada", "die Schwägerin"],
      ["el sobrino", "der Neffe"], ["la sobrina", "die Nichte"], ["el abuelo", "der Großvater"],
      ["la abuela", "die Großmutter"], ["el primo", "der Cousin"], ["la prima", "die Cousine"],
      ["los padres", "die Eltern"], ["los parientes", "die Verwandten"], ["la boda", "die Hochzeit"],
      ["cariñoso", "liebevoll"], ["la comida familiar", "das Familienessen"], ["quedarse a dormir", "über Nacht bleiben"]
    ],
    s: [
      ["Encantado de conocer a tus [padres].", "Schön, deine Eltern kennenzulernen."],
      ["Mi [suegra] cocina muy bien.", "Meine Schwiegermutter kocht sehr gut."],
      ["Gracias por invitarnos a [comer].", "Danke, dass ihr uns zum Essen eingeladen habt."],
      ["¿Cómo está toda la [familia]?", "Wie geht es der ganzen Familie?"],
      ["Hace mucho tiempo que no os [veíamos].", "Wir haben euch lange nicht gesehen."],
      ["Os echamos mucho de [menos].", "Wir vermissen euch sehr."],
      ["Mi mujer me ha [hablado] mucho de vosotros.", "Meine Frau hat mir viel von euch erzählt."],
      ["Estamos muy [contentos] de estar aquí.", "Wir freuen uns sehr, hier zu sein."]
    ]
  },
  {
    id: "comida", icon: "🍽️", title: "Essen & Restaurant",
    w: [
      ["la carta", "die Speisekarte"], ["la cuenta", "die Rechnung"], ["el camarero", "der Kellner"],
      ["el plato del día", "das Tagesgericht"], ["el postre", "der Nachtisch"], ["la propina", "das Trinkgeld"],
      ["la tortilla", "das Kartoffelomelett"], ["el jamón", "der Schinken"], ["el pescado", "der Fisch"],
      ["la ensalada", "der Salat"], ["la sobremesa", "das Beisammensitzen nach dem Essen"], ["las tapas", "die Tapas"],
      ["picante", "scharf"], ["delicioso", "köstlich"], ["la receta", "das Rezept"],
      ["estar lleno", "satt sein"], ["pedir", "bestellen, bitten"], ["compartir", "teilen"]
    ],
    s: [
      ["Una mesa para [cuatro], por favor.", "Einen Tisch für vier, bitte."],
      ["¿Qué nos [recomienda]?", "Was empfehlen Sie uns?"],
      ["Yo voy a [tomar] el pescado.", "Ich nehme den Fisch."],
      ["¿Nos [trae] la cuenta, por favor?", "Bringen Sie uns bitte die Rechnung?"],
      ["Estaba todo [riquísimo].", "Alles war super lecker."],
      ["No puedo [más], estoy lleno.", "Ich kann nicht mehr, ich bin satt."],
      ["¿Me [pasas] la sal?", "Reichst du mir das Salz?"],
      ["Soy [alérgico] a los frutos secos.", "Ich bin allergisch gegen Nüsse."]
    ]
  },
  {
    id: "cotidiano", icon: "🏠", title: "Alltag",
    w: [
      ["madrugar", "früh aufstehen"], ["la compra", "der Einkauf"], ["el trabajo", "die Arbeit"],
      ["cansado", "müde"], ["el ordenador", "der Computer"], ["el móvil", "das Handy"],
      ["la semana que viene", "nächste Woche"], ["el fin de semana", "das Wochenende"], ["acordarse de", "sich erinnern an"],
      ["olvidarse de", "vergessen"], ["tener prisa", "es eilig haben"], ["quedar con alguien", "sich verabreden"],
      ["llegar tarde", "zu spät kommen"], ["el tráfico", "der Verkehr"], ["la casa", "das Haus"],
      ["vivir", "wohnen, leben"], ["el barrio", "das Viertel"], ["a veces", "manchmal"]
    ],
    s: [
      ["Normalmente me [levanto] a las siete.", "Normalerweise stehe ich um sieben auf."],
      ["Hoy tengo mucho [trabajo].", "Heute habe ich viel Arbeit."],
      ["Perdona, he [llegado] tarde.", "Entschuldige, ich bin zu spät gekommen."],
      ["¿Qué vas a [hacer] este fin de semana?", "Was machst du dieses Wochenende?"],
      ["Tengo que ir a [comprar] pan.", "Ich muss Brot kaufen gehen."],
      ["Vivimos en un [piso] pequeño.", "Wir wohnen in einer kleinen Wohnung."],
      ["Ayer [estuve] en casa todo el día.", "Gestern war ich den ganzen Tag zu Hause."],
      ["Me he [olvidado] el móvil en casa.", "Ich habe mein Handy zu Hause vergessen."]
    ]
  },
  {
    id: "viajes", icon: "✈️", title: "Reisen",
    w: [
      ["el billete", "das Ticket"], ["el aeropuerto", "der Flughafen"], ["la estación", "der Bahnhof"],
      ["la maleta", "der Koffer"], ["el retraso", "die Verspätung"], ["la habitación", "das Zimmer"],
      ["la reserva", "die Reservierung"], ["el alquiler de coches", "die Autovermietung"], ["la playa", "der Strand"],
      ["el pueblo", "das Dorf"], ["la dirección", "die Adresse"], ["a la derecha", "rechts"],
      ["a la izquierda", "links"], ["todo recto", "geradeaus"], ["cerca", "in der Nähe"],
      ["lejos", "weit weg"], ["perderse", "sich verlaufen"], ["recomendar", "empfehlen"]
    ],
    s: [
      ["¿A qué hora sale el próximo [tren]?", "Wann fährt der nächste Zug?"],
      ["Tengo una [reserva] a nombre de Spill.", "Ich habe eine Reservierung auf den Namen Spill."],
      ["Perdone, ¿cómo se [llega] a la plaza?", "Entschuldigung, wie kommt man zum Platz?"],
      ["Siga todo [recto] y gire a la derecha.", "Gehen Sie geradeaus und biegen Sie rechts ab."],
      ["El vuelo ha [salido] con retraso.", "Der Flug ist verspätet abgeflogen."],
      ["Nos hemos [perdido] un poco.", "Wir haben uns ein bisschen verlaufen."],
      ["¿Hay algún [restaurante] por aquí cerca?", "Gibt es hier in der Nähe ein Restaurant?"],
      ["Nos [gustaría] ver el pueblo.", "Wir würden gern das Dorf sehen."]
    ]
  },
  {
    id: "charla", icon: "💬", title: "Smalltalk mit Freunden",
    w: [
      ["¿Qué tal?", "Wie geht's?"], ["vale", "okay, in Ordnung"], ["el tío / la tía", "der Typ / die Frau (umgangssprachlich)"],
      ["guay", "cool"], ["¡qué pena!", "wie schade!"], ["¡qué bien!", "wie schön!"],
      ["quedar", "sich treffen"], ["tomar algo", "etwas trinken gehen"], ["pasarlo bien", "Spaß haben"],
      ["me apetece", "ich habe Lust auf"], ["tener ganas de", "Lust haben auf"], ["la verdad", "ehrlich gesagt"],
      ["ya", "schon, genau"], ["de acuerdo", "einverstanden"], ["no pasa nada", "kein Problem"],
      ["por cierto", "übrigens"], ["en serio", "im Ernst"], ["a lo mejor", "vielleicht"]
    ],
    s: [
      ["¿Qué tal si [quedamos] el viernes?", "Wie wäre es, wenn wir uns Freitag treffen?"],
      ["Me [apetece] tomar algo.", "Ich habe Lust, etwas trinken zu gehen."],
      ["La verdad es que no [tengo] ganas.", "Ehrlich gesagt habe ich keine Lust."],
      ["Lo pasamos [genial] ayer.", "Wir hatten gestern viel Spaß."],
      ["A lo [mejor] voy, no sé.", "Vielleicht komme ich, ich weiß nicht."],
      ["¿Has [visto] la nueva película?", "Hast du den neuen Film gesehen?"],
      ["No te [preocupes], no pasa nada.", "Mach dir keine Sorgen, kein Problem."],
      ["Por [cierto], ¿cómo está tu hermano?", "Übrigens, wie geht es deinem Bruder?"]
    ]
  }
];

// Konjugation Präsens: [yo, tú, él/ella, nosotros, vosotros, ellos/ellas]
const VERBS = [
  ["ser", "sein", ["soy", "eres", "es", "somos", "sois", "son"]],
  ["estar", "sein (Zustand/Ort)", ["estoy", "estás", "está", "estamos", "estáis", "están"]],
  ["tener", "haben", ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"]],
  ["ir", "gehen, fahren", ["voy", "vas", "va", "vamos", "vais", "van"]],
  ["hacer", "machen", ["hago", "haces", "hace", "hacemos", "hacéis", "hacen"]],
  ["poder", "können", ["puedo", "puedes", "puede", "podemos", "podéis", "pueden"]],
  ["querer", "wollen, lieben", ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"]],
  ["decir", "sagen", ["digo", "dices", "dice", "decimos", "decís", "dicen"]],
  ["venir", "kommen", ["vengo", "vienes", "viene", "venimos", "venís", "vienen"]],
  ["hablar", "sprechen", ["hablo", "hablas", "habla", "hablamos", "habláis", "hablan"]],
  ["comer", "essen", ["como", "comes", "come", "comemos", "coméis", "comen"]],
  ["vivir", "wohnen", ["vivo", "vives", "vive", "vivimos", "vivís", "viven"]]
];
const PERSONS = ["yo", "tú", "él / ella", "nosotros", "vosotros", "ellos / ellas"];
