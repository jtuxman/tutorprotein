// Mnemotecnias y datos curiosos de los 20 aminoácidos estándar.
//
// Todo el texto es contenido didáctico original de AminoLab (escrito desde
// cero, sin copiar de Proteopedia, PDB-101 ni libros).

export interface AminoAcidTrivia {
  /** Código de 3 letras ('Ala', 'Trp'…). */
  code3: string
  /** Truco original para recordar el código, la estructura o la propiedad clave. */
  mnemonic: string
  /** Origen etimológico del nombre. */
  etymology: string
  /** Dónde aparece en la vida cotidiana, la fisiología o la clínica. */
  realLife: string
}

export const TRIVIA: Record<string, AminoAcidTrivia> = {
  Gly: {
    code3: 'Gly',
    mnemonic: 'G de Glicina y de Giro: como su cadena lateral es solo un H, cabe en los giros más estrechos donde ningún otro entra.',
    etymology: 'Del griego «glykys» (dulce): cuando Henri Braconnot la aisló de la gelatina en 1820 notó que sabía dulce.',
    realLife: 'Uno de cada tres residuos del colágeno de la piel y los tendones es glicina; además actúa como neurotransmisor inhibidor en la médula espinal.',
  },
  Ala: {
    code3: 'Ala',
    mnemonic: 'A de Alanina y de Arranque: un solo metilo (–CH₃) como peldaño inicial de las cadenas laterales con carbono.',
    etymology: 'De «aldehído» + «-ina»: Adolph Strecker la sintetizó en 1850 a partir de acetaldehído y amoniaco.',
    realLife: 'Protagoniza el ciclo glucosa-alanina que transporta nitrógeno desde el músculo en ejercicio hasta el hígado.',
  },
  Pro: {
    code3: 'Pro',
    mnemonic: 'P de Prolina y de Puerta cerrada: la cadena lateral vuelve a cerrarse sobre el nitrógeno α formando un anillo de cinco eslabones.',
    etymology: 'Abreviatura de «ácido pirrolidina-2-carboxílico», por el anillo de pirrolidina que encierra su esqueleto.',
    realLife: 'Rompe las hélices α normales pero estabiliza la triple hélice del colágeno; su hidroxilación requiere vitamina C (su falta causa escorbuto).',
  },
  Val: {
    code3: 'Val',
    mnemonic: 'La V de Valina se dibuja sola en su cadena lateral: una horquilla isopropilo con dos metilos abiertos en forma de V.',
    etymology: 'Del ácido valeriánico, aislado de la raíz de la valeriana («Valeriana officinalis»), con el que comparte esqueleto ramificado.',
    realLife: 'Es uno de los tres aminoácidos de cadena ramificada (BCAA) del músculo; en la anemia falciforme sustituye a un glutamato en la hemoglobina.',
  },
  Leu: {
    code3: 'Leu',
    mnemonic: 'L de Leucina y de «Lejos la horquilla»: tiene la misma V final que la valina, pero separada del esqueleto por un –CH₂– extra.',
    etymology: 'Del griego «leukos» (blanco), por los cristales blancos brillantes que Proust y Braconnot obtuvieron al hidrolizar lana y queso.',
    realLife: 'Es el aminoácido más abundante en las proteínas y activa la vía mTOR que estimula la síntesis proteica muscular tras comer.',
  },
  Ile: {
    code3: 'Ile',
    mnemonic: 'I de Isoleucina y de Isómero: tiene exactamente los mismos átomos que la leucina, pero la ramificación nace pegada al Cα.',
    etymology: 'De «iso-» (igual) + «leucina»: Félix Ehrlich la descubrió en 1903 en la melaza de remolacha como isómero de la leucina.',
    realLife: 'Tiene el índice de hidropatía más alto (+4.5): se refugia en el interior seco de las proteínas globulares y en hélices transmembrana.',
  },
  Met: {
    code3: 'Met',
    mnemonic: 'M de Metionina y de Marcha: el codón AUG que la codifica es la señal universal de inicio de la traducción.',
    etymology: 'De «metilo» + «tio» (azufre) + «-ina»: alude al grupo tioéter (–S–CH₃) de su cadena lateral.',
    realLife: 'Precursora de la S-adenosilmetionina (SAM), el principal donador de grupos metilo para el ADN, los lípidos y la adrenalina.',
  },
  Phe: {
    code3: 'Phe',
    mnemonic: 'Sonido «Fe» de Fenilalanina → F: es simplemente una alanina a la que se le colgó un anillo fenilo entero.',
    etymology: 'De «fenilo» + «alanina», nombre propuesto al descubrirse en brotes de altramuz que era una alanina con un anillo bencénico.',
    realLife: 'En la fenilcetonuria (detectada con la prueba del talón del recién nacido) falta la enzima que la convierte en tirosina; forma parte del edulcorante aspartamo.',
  },
  Tyr: {
    code3: 'Tyr',
    mnemonic: 'Y de «tYrosina»: imagina el anillo fenilo rematado arriba por la horquilla del grupo –OH como una letra Y.',
    etymology: 'Del griego «tyros» (queso): Justus von Liebig la aisló en 1846 al tratar caseína de queso con álcali.',
    realLife: 'Precursora de dopamina, noradrenalina, adrenalina, hormonas tiroideas y la melanina que da color a la piel y al pelo.',
  },
  Trp: {
    code3: 'Trp',
    mnemonic: 'W es la letra más ancha del abecedario para el aminoácido más voluminoso: el anillo doble del indol parece una W acostada.',
    etymology: 'De «tripsina» + «peptona»: Hopkins y Cole la aislaron en 1901 tras digerir caseína con extracto pancreático.',
    realLife: 'Precursor de la serotonina (estado de ánimo) y la melatonina (sueño), y principal responsable de que las proteínas absorban luz UV a 280 nm.',
  },
  Ser: {
    code3: 'Ser',
    mnemonic: 'S de Serina y de Sencilla con –OH: como una alanina a la que se le añadió un grupo hidroxilo.',
    etymology: 'Del latín «sericum» (seda): Emil Cramer la obtuvo en 1865 a partir de la sericina de los capullos del gusano de seda.',
    realLife: 'Forma la tríada catalítica de las serina-proteasas (tripsina, quimotripsina) y es el residuo más fosforilado para encender o apagar proteínas.',
  },
  Thr: {
    code3: 'Thr',
    mnemonic: 'T de Treonina y de «Tiene dos centros»: junto con la isoleucina es uno de los dos aminoácidos con dos carbonos quirales.',
    etymology: 'Nombrada por su semejanza estereoquímica con la azúcar de cuatro carbonos D-treosa; fue el último de los 20 comunes en descubrirse (William Rose, 1935).',
    realLife: 'Abunda en las mucinas que recubren y protegen las vías respiratorias y digestivas, donde su –OH sujeta cadenas de azúcares (O-glicosilación).',
  },
  Cys: {
    code3: 'Cys',
    mnemonic: 'C de Cisteína y de Candado: dos tioles (–SH) se oxidan y cierran un puente disulfuro (–S–S–) entre cadenas.',
    etymology: 'Del griego «kystis» (vejiga): su dímero, la cistina, fue aislado primero por Wollaston en 1810 a partir de un cálculo urinario.',
    realLife: 'Los puentes disulfuro de la queratina dan forma al cabello (las permanentes los abren y vuelven a cerrar) y forma parte del antioxidante glutatión.',
  },
  Asn: {
    code3: 'Asn',
    mnemonic: 'asparagiNa → N: es el hermano neutro del ácido aspártico, con un nitrógeno de amida (–CONH₂) donde antes había un ácido.',
    etymology: 'De «Asparagus» (espárrago): Vauquelin y Robiquet la cristalizaron en 1806 del jugo de espárrago; fue el primer aminoácido aislado de la historia.',
    realLife: 'Su nitrógeno amida es el punto de anclaje de la N-glicosilación de proteínas; al hornear o freír con azúcares produce acrilamida (reacción de Maillard).',
  },
  Gln: {
    code3: 'Gln',
    mnemonic: 'Q de «Q-lutamina»: un carbono más larga que la asparagina y con una amida final neutra que transporta nitrógeno sin carga.',
    etymology: 'De «ácido glutámico» + «amina»: aislada de la remolacha por Schulze y Bosshard en 1883.',
    realLife: 'Es el aminoácido libre más abundante en la sangre humana: transporta amonio de forma segura y sirve de combustible a enterocitos y linfocitos.',
  },
  Lys: {
    code3: 'Lys',
    mnemonic: 'K es la letra vecina a la L en el alfabeto: una cadena de cuatro carbonos rematada por un grupo –NH₃⁺ a pH 7.',
    etymology: 'Del griego «lysis» (disolución, ruptura): Edmund Drechsel la obtuvo en 1889 al hidrolizar caseína.',
    realLife: 'En las histonas sus cargas positivas abrazan al ADN negativo; la acetilación o metilación de esas lisinas regula qué genes se expresan (epigenética).',
  },
  Arg: {
    code3: 'Arg',
    mnemonic: 'Sonido «aRg» → R y «tRes nitrógenos»: su grupo guanidinio reparte la carga positiva entre tres N y nunca la suelta a pH fisiológico.',
    etymology: 'Del griego «argyros» (plata), por el brillo plateado de las sales que Hedin y Schulze aislaron en plántulas de altramuz.',
    realLife: 'Intermediario clave del ciclo de la urea y sustrato de la óxido nítrico sintasa, que libera NO para dilatar los vasos sanguíneos.',
  },
  His: {
    code3: 'His',
    mnemonic: 'H de Histidina y de «pH bisagra»: con un pKa de 6.0 es la única cadena lateral que cambia de carga cerca de pH 7.',
    etymology: 'Del griego «histion» (tejido), propuesto por Albrecht Kossel en 1896 al aislarla de proteínas tisulares de esturión.',
    realLife: 'Coordina el átomo de hierro del grupo hemo en la hemoglobina y, al descarboxilarse en los mastocitos, se convierte en histamina (alergias).',
  },
  Asp: {
    code3: 'Asp',
    mnemonic: 'asparDico → D (la primera letra libre tras A, B, C): cadena corta con un solo –CH₂– antes del carboxilato negativo.',
    etymology: 'Derivado de la asparagina: Plisson lo obtuvo en 1827 al hervir asparagina de espárrago con agua de barita.',
    realLife: 'Participa en el ciclo de la urea y en la lanzadera malato-aspartato mitocondrial; unido a la fenilalanina forma el edulcorante aspartamo.',
  },
  Glu: {
    code3: 'Glu',
    mnemonic: 'E viene justo después de la D de Asp: tiene un –CH₂– más que el aspartato, así que a letra siguiente le toca cadena un paso más larga.',
    etymology: 'Del latín «gluten» (pegamento): Karl Ritthausen lo aisló en 1866 a partir del gluten de trigo.',
    realLife: 'Es el principal neurotransmisor excitador del cerebro y, como glutamato monosódico, da el sabor «umami» descubierto por Kikunae Ikeda en el caldo de alga kombu.',
  },
}
