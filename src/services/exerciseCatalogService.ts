
import { db } from '../db/database'
import type { Exercise, ExerciseCategory } from '../types/domain'

type CatalogEntry = readonly [
  name: string,
  equipment: string,
  movementPattern: string,
]

// Categorías compatibles con el modelo actual.
// Movilidad y elongación quedan en "Otro" hasta
// implementar categorías personalizables.

const CATALOG: Record<ExerciseCategory, CatalogEntry[]> = {
  'Glúteos': [
    ['Hip thrust', 'Barra o máquina', 'Extensión de cadera'],
    ['Hip thrust con barra', 'Barra y banco', 'Extensión de cadera'],
    ['Hip thrust en máquina', 'Máquina', 'Extensión de cadera'],
    ['Hip thrust en Smith', 'Smith y banco', 'Extensión de cadera'],
    ['Hip thrust unilateral', 'Banco o colchoneta', 'Extensión de cadera'],
    ['Puente de glúteos en suelo', 'Colchoneta', 'Extensión de cadera'],
    ['Puente de glúteos con barra', 'Barra y colchoneta', 'Extensión de cadera'],
    ['Puente de glúteos unilateral', 'Colchoneta', 'Extensión de cadera'],
    ['Puente de glúteos con banda', 'Banda y colchoneta', 'Extensión de cadera'],
    ['Patada de glúteo en polea', 'Polea', 'Extensión de cadera'],
    ['Patada de glúteo en máquina', 'Máquina', 'Extensión de cadera'],
    ['Patada de glúteo en cuadrupedia', 'Colchoneta', 'Extensión de cadera'],
    ['Patada de glúteo con banda', 'Banda', 'Extensión de cadera'],
    ['Patada cruzada de glúteo en polea', 'Polea', 'Extensión diagonal de cadera'],
    ['Abducción de cadera en máquina', 'Máquina', 'Abducción de cadera'],
    ['Abducción de cadera en polea', 'Polea', 'Abducción de cadera'],
    ['Abducción de cadera con banda de pie', 'Banda', 'Abducción de cadera'],
    ['Abducción de cadera acostada de lado', 'Colchoneta', 'Abducción de cadera'],
    ['Abducción de cadera sentado con banda', 'Banda y banco', 'Abducción de cadera'],
    ['Caminata lateral con banda', 'Minibanda', 'Abducción de cadera'],
    ['Monster walk con banda', 'Minibanda', 'Abducción de cadera'],
    ['Clamshell con banda', 'Minibanda y colchoneta', 'Rotación externa de cadera'],
    ['Frog pumps', 'Colchoneta', 'Extensión de cadera'],
    ['Fire hydrant', 'Colchoneta', 'Abducción de cadera'],
    ['Pull-through en polea', 'Polea', 'Bisagra de cadera'],
    ['Hiperextensión de glúteos en banco 45°', 'Banco de hiperextensiones', 'Extensión de cadera'],
    ['Subida al banco enfocada en glúteos', 'Banco o cajón', 'Extensión de cadera'],
    ['Sentadilla búlgara enfocada en glúteos', 'Banco y mancuernas', 'Dominante de cadera'],
    ['Peso muerto sumo con barra', 'Barra', 'Bisagra de cadera'],
    ['Peso muerto sumo con mancuerna', 'Mancuerna', 'Bisagra de cadera'],
  ],

  'Cuádriceps': [
    ['Sentadilla con barra', 'Barra y rack', 'Sentadilla'],
    ['Sentadilla frontal con barra', 'Barra y rack', 'Sentadilla'],
    ['Sentadilla goblet', 'Mancuerna o kettlebell', 'Sentadilla'],
    ['Sentadilla en Smith', 'Máquina Smith', 'Sentadilla'],
    ['Sentadilla hack', 'Máquina hack', 'Sentadilla'],
    ['Sentadilla pendular', 'Máquina pendular', 'Sentadilla'],
    ['Sentadilla sumo con mancuerna', 'Mancuerna', 'Sentadilla'],
    ['Sentadilla con talones elevados', 'Discos o cuña', 'Sentadilla'],
    ['Sentadilla con peso corporal', 'Peso corporal', 'Sentadilla'],
    ['Sentadilla a banco o cajón', 'Banco o cajón', 'Sentadilla'],
    ['Sentadilla isométrica en pared', 'Pared', 'Isometría de rodilla'],
    ['Sentadilla española con banda', 'Banda', 'Sentadilla'],
    ['Sentadilla sissy asistida', 'Soporte', 'Extensión de rodilla'],
    ['Prensa de piernas 45°', 'Prensa inclinada', 'Empuje de piernas'],
    ['Prensa de piernas horizontal', 'Prensa horizontal', 'Empuje de piernas'],
    ['Prensa de piernas vertical', 'Prensa vertical', 'Empuje de piernas'],
    ['Prensa de piernas unilateral', 'Prensa', 'Empuje unilateral'],
    ['Extensión de cuádriceps en máquina', 'Máquina', 'Extensión de rodilla'],
    ['Extensión de cuádriceps unilateral', 'Máquina', 'Extensión de rodilla'],
    ['Zancada hacia adelante', 'Mancuernas o peso corporal', 'Zancada'],
    ['Zancada hacia atrás', 'Mancuernas o peso corporal', 'Zancada'],
    ['Zancadas caminando', 'Mancuernas o peso corporal', 'Zancada'],
    ['Zancada estática', 'Mancuernas o peso corporal', 'Zancada'],
    ['Sentadilla búlgara enfocada en cuádriceps', 'Banco y mancuernas', 'Zancada'],
    ['Step-up al banco', 'Banco o cajón', 'Subida al escalón'],
    ['Step-down desde banco', 'Banco o cajón', 'Bajada controlada'],
    ['Pistol squat asistida', 'Soporte', 'Sentadilla unilateral'],
    ['Split squat', 'Peso corporal o mancuernas', 'Zancada'],
  ],

  'Femoral': [
    ['Peso muerto rumano con barra', 'Barra', 'Bisagra de cadera'],
    ['Peso muerto rumano con mancuernas', 'Mancuernas', 'Bisagra de cadera'],
    ['Peso muerto rumano en Smith', 'Máquina Smith', 'Bisagra de cadera'],
    ['Peso muerto rumano unilateral', 'Mancuerna', 'Bisagra unilateral'],
    ['Peso muerto convencional', 'Barra', 'Bisagra de cadera'],
    ['Peso muerto con piernas semirrígidas', 'Barra o mancuernas', 'Bisagra de cadera'],
    ['Curl femoral acostado en máquina', 'Máquina', 'Flexión de rodilla'],
    ['Curl femoral sentado en máquina', 'Máquina', 'Flexión de rodilla'],
    ['Curl femoral de pie en máquina', 'Máquina', 'Flexión de rodilla'],
    ['Curl femoral unilateral', 'Máquina', 'Flexión de rodilla'],
    ['Curl femoral de pie en polea', 'Polea', 'Flexión de rodilla'],
    ['Curl femoral con banda', 'Banda', 'Flexión de rodilla'],
    ['Curl femoral con pelota suiza', 'Pelota suiza y colchoneta', 'Flexión de rodilla'],
    ['Curl femoral deslizante con toallas', 'Toallas y suelo liso', 'Flexión de rodilla'],
    ['Curl nórdico asistido', 'Soporte o compañero', 'Flexión de rodilla'],
    ['Glute ham raise', 'Banco GHD', 'Flexión de rodilla'],
    ['Buenos días con barra', 'Barra', 'Bisagra de cadera'],
    ['Buenos días con banda', 'Banda', 'Bisagra de cadera'],
    ['Buenos días en Smith', 'Máquina Smith', 'Bisagra de cadera'],
    ['Peso muerto con kettlebell', 'Kettlebell', 'Bisagra de cadera'],
    ['Swing con kettlebell', 'Kettlebell', 'Bisagra explosiva'],
  ],

  'Pantorrilla': [
    ['Elevación de talones de pie en máquina', 'Máquina', 'Flexión plantar'],
    ['Elevación de talones sentado en máquina', 'Máquina', 'Flexión plantar'],
    ['Elevación de talones en prensa', 'Prensa', 'Flexión plantar'],
    ['Elevación de talones de pie con mancuernas', 'Mancuernas', 'Flexión plantar'],
    ['Elevación de talones con barra', 'Barra', 'Flexión plantar'],
    ['Elevación de talones unilateral', 'Escalón', 'Flexión plantar'],
    ['Elevación de talones en escalón', 'Escalón', 'Flexión plantar'],
    ['Elevación de talones sentado con mancuerna', 'Banco y mancuerna', 'Flexión plantar'],
    ['Elevación de talones en Smith', 'Máquina Smith', 'Flexión plantar'],
    ['Saltos suaves en puntas', 'Peso corporal', 'Rebote de tobillo'],
    ['Elevación de puntas tibial anterior', 'Pared o máquina', 'Dorsiflexión'],
    ['Caminata de puntillas', 'Peso corporal', 'Flexión plantar'],
  ],

  'Espalda': [
    ['Jalón al pecho agarre ancho', 'Polea alta', 'Tracción vertical'],
    ['Jalón al pecho agarre neutro', 'Polea alta', 'Tracción vertical'],
    ['Jalón al pecho agarre supino', 'Polea alta', 'Tracción vertical'],
    ['Jalón unilateral en polea alta', 'Polea alta', 'Tracción vertical'],
    ['Dominadas pronas', 'Barra de dominadas', 'Tracción vertical'],
    ['Dominadas supinas', 'Barra de dominadas', 'Tracción vertical'],
    ['Dominadas asistidas', 'Máquina asistida o banda', 'Tracción vertical'],
    ['Remo sentado en polea agarre neutro', 'Polea baja', 'Tracción horizontal'],
    ['Remo sentado en polea agarre ancho', 'Polea baja', 'Tracción horizontal'],
    ['Remo en máquina convergente', 'Máquina', 'Tracción horizontal'],
    ['Remo en máquina unilateral', 'Máquina', 'Tracción horizontal'],
    ['Remo con barra', 'Barra', 'Tracción horizontal'],
    ['Remo con barra T', 'Barra T', 'Tracción horizontal'],
    ['Remo Pendlay', 'Barra', 'Tracción horizontal'],
    ['Remo con mancuerna a una mano', 'Mancuerna y banco', 'Tracción horizontal'],
    ['Remo con dos mancuernas', 'Mancuernas', 'Tracción horizontal'],
    ['Remo inclinado con pecho apoyado', 'Banco inclinado y mancuernas', 'Tracción horizontal'],
    ['Remo invertido en barra', 'Barra o Smith', 'Tracción horizontal'],
    ['Remo con banda elástica', 'Banda', 'Tracción horizontal'],
    ['Jalón de brazos rectos en polea', 'Polea alta', 'Extensión de hombro'],
    ['Pullover con mancuerna', 'Banco y mancuerna', 'Extensión de hombro'],
    ['Pullover en máquina', 'Máquina', 'Extensión de hombro'],
    ['Face pull en polea', 'Polea', 'Tracción y rotación externa'],
    ['Pájaros en pec deck inverso', 'Máquina', 'Apertura posterior'],
    ['Encogimiento de trapecios con mancuernas', 'Mancuernas', 'Elevación escapular'],
    ['Encogimiento de trapecios con barra', 'Barra', 'Elevación escapular'],
    ['Hiperextensión lumbar en banco', 'Banco de hiperextensiones', 'Extensión de tronco'],
    ['Superman en colchoneta', 'Colchoneta', 'Extensión de tronco'],
  ],

  'Pecho': [
    ['Press de banca plano con barra', 'Banco y barra', 'Empuje horizontal'],
    ['Press de banca plano con mancuernas', 'Banco y mancuernas', 'Empuje horizontal'],
    ['Press de banca inclinado con barra', 'Banco inclinado y barra', 'Empuje inclinado'],
    ['Press de banca inclinado con mancuernas', 'Banco inclinado y mancuernas', 'Empuje inclinado'],
    ['Press de banca declinado con barra', 'Banco declinado y barra', 'Empuje declinado'],
    ['Press de banca declinado con mancuernas', 'Banco declinado y mancuernas', 'Empuje declinado'],
    ['Press de pecho en máquina', 'Máquina', 'Empuje horizontal'],
    ['Press de pecho convergente', 'Máquina', 'Empuje horizontal'],
    ['Press de pecho en Smith', 'Smith y banco', 'Empuje horizontal'],
    ['Press de pecho en suelo con mancuernas', 'Colchoneta y mancuernas', 'Empuje horizontal'],
    ['Aperturas de pecho con mancuernas', 'Banco y mancuernas', 'Aducción horizontal'],
    ['Aperturas inclinadas con mancuernas', 'Banco inclinado y mancuernas', 'Aducción horizontal'],
    ['Aperturas de pecho en polea', 'Poleas', 'Aducción horizontal'],
    ['Cruce de poleas de arriba hacia abajo', 'Poleas', 'Aducción diagonal'],
    ['Cruce de poleas de abajo hacia arriba', 'Poleas', 'Aducción diagonal'],
    ['Pec deck de pecho', 'Máquina', 'Aducción horizontal'],
    ['Flexiones de brazos', 'Peso corporal', 'Empuje horizontal'],
    ['Flexiones inclinadas con manos en banco', 'Banco', 'Empuje horizontal'],
    ['Flexiones con rodillas apoyadas', 'Colchoneta', 'Empuje horizontal'],
    ['Flexiones declinadas con pies en banco', 'Banco', 'Empuje horizontal'],
    ['Flexiones con agarre ancho', 'Peso corporal', 'Empuje horizontal'],
    ['Fondos en paralelas enfocados en pecho', 'Paralelas', 'Empuje vertical'],
    ['Squeeze press con mancuernas', 'Banco y mancuernas', 'Empuje horizontal'],
  ],

  'Hombros': [
    ['Press militar de pie con barra', 'Barra', 'Empuje vertical'],
    ['Press militar sentado con barra', 'Banco y barra', 'Empuje vertical'],
    ['Press de hombros sentado con mancuernas', 'Banco y mancuernas', 'Empuje vertical'],
    ['Press de hombros en máquina', 'Máquina', 'Empuje vertical'],
    ['Press Arnold', 'Mancuernas', 'Empuje vertical'],
    ['Press de hombros en Smith', 'Máquina Smith', 'Empuje vertical'],
    ['Elevaciones laterales con mancuernas', 'Mancuernas', 'Abducción de hombro'],
    ['Elevaciones laterales en polea', 'Polea', 'Abducción de hombro'],
    ['Elevaciones laterales en máquina', 'Máquina', 'Abducción de hombro'],
    ['Elevaciones laterales inclinado de lado', 'Banco inclinado y mancuerna', 'Abducción de hombro'],
    ['Elevaciones frontales con mancuernas', 'Mancuernas', 'Flexión de hombro'],
    ['Elevaciones frontales con disco', 'Disco', 'Flexión de hombro'],
    ['Elevaciones frontales en polea', 'Polea', 'Flexión de hombro'],
    ['Pájaros con mancuernas', 'Mancuernas', 'Apertura posterior'],
    ['Pájaros con pecho apoyado en banco', 'Banco inclinado y mancuernas', 'Apertura posterior'],
    ['Aperturas inversas en polea', 'Poleas', 'Apertura posterior'],
    ['Remo al mentón con barra', 'Barra', 'Tracción vertical'],
    ['Remo al mentón en polea', 'Polea', 'Tracción vertical'],
    ['Rotación externa de hombro con banda', 'Banda', 'Rotación externa'],
    ['Rotación externa de hombro en polea', 'Polea', 'Rotación externa'],
    ['Rotación interna de hombro con banda', 'Banda', 'Rotación interna'],
    ['Wall slides para hombros', 'Pared', 'Movilidad escapular'],
    ['Y-T-W en banco inclinado', 'Banco inclinado', 'Estabilidad escapular'],
  ],

  'Bíceps': [
    ['Curl de bíceps con barra recta', 'Barra', 'Flexión de codo'],
    ['Curl de bíceps con barra EZ', 'Barra EZ', 'Flexión de codo'],
    ['Curl alterno con mancuernas', 'Mancuernas', 'Flexión de codo'],
    ['Curl martillo con mancuernas', 'Mancuernas', 'Flexión de codo'],
    ['Curl martillo cruzado', 'Mancuernas', 'Flexión de codo'],
    ['Curl concentrado', 'Mancuerna y banco', 'Flexión de codo'],
    ['Curl predicador con barra EZ', 'Banco predicador', 'Flexión de codo'],
    ['Curl predicador en máquina', 'Máquina', 'Flexión de codo'],
    ['Curl inclinado con mancuernas', 'Banco inclinado y mancuernas', 'Flexión de codo'],
    ['Curl en polea baja', 'Polea baja', 'Flexión de codo'],
    ['Curl unilateral en polea', 'Polea', 'Flexión de codo'],
    ['Curl bayesiano en polea', 'Polea', 'Flexión de codo'],
    ['Curl araña en banco inclinado', 'Banco inclinado y mancuernas', 'Flexión de codo'],
    ['Curl inverso con barra', 'Barra', 'Flexión de codo'],
    ['Curl Zottman', 'Mancuernas', 'Flexión y pronación'],
    ['Curl de bíceps con banda', 'Banda', 'Flexión de codo'],
  ],

  'Tríceps': [
    ['Extensión de tríceps en polea con cuerda', 'Polea y cuerda', 'Extensión de codo'],
    ['Extensión de tríceps en polea con barra', 'Polea y barra', 'Extensión de codo'],
    ['Extensión de tríceps en polea agarre inverso', 'Polea', 'Extensión de codo'],
    ['Extensión de tríceps unilateral en polea', 'Polea', 'Extensión de codo'],
    ['Extensión de tríceps por encima de la cabeza en polea', 'Polea', 'Extensión de codo'],
    ['Extensión de tríceps sobre cabeza con mancuerna', 'Mancuerna', 'Extensión de codo'],
    ['Extensión de tríceps francesa con barra EZ', 'Banco y barra EZ', 'Extensión de codo'],
    ['Press francés con mancuernas', 'Banco y mancuernas', 'Extensión de codo'],
    ['Press de banca agarre cerrado', 'Banco y barra', 'Empuje horizontal'],
    ['Fondos de tríceps en paralelas', 'Paralelas', 'Empuje vertical'],
    ['Fondos de tríceps en banco', 'Banco', 'Empuje vertical'],
    ['Flexiones diamante', 'Colchoneta', 'Empuje horizontal'],
    ['Flexiones cerradas', 'Colchoneta', 'Empuje horizontal'],
    ['Patada de tríceps con mancuerna', 'Mancuerna', 'Extensión de codo'],
    ['Patada de tríceps en polea', 'Polea', 'Extensión de codo'],
    ['Extensión de tríceps en máquina', 'Máquina', 'Extensión de codo'],
    ['Extensión de tríceps con banda', 'Banda', 'Extensión de codo'],
  ],

  'Core': [
    ['Plancha frontal', 'Colchoneta', 'Antiextensión'],
    ['Plancha sobre antebrazos', 'Colchoneta', 'Antiextensión'],
    ['Plancha con brazos extendidos', 'Colchoneta', 'Antiextensión'],
    ['Plancha lateral', 'Colchoneta', 'Antiinclinación'],
    ['Plancha lateral con rodillas apoyadas', 'Colchoneta', 'Antiinclinación'],
    ['Plancha con toque de hombros', 'Colchoneta', 'Antirrotación'],
    ['Plancha con elevación alterna de pierna', 'Colchoneta', 'Antiextensión'],
    ['Dead bug', 'Colchoneta', 'Control lumbopélvico'],
    ['Dead bug simplificado', 'Colchoneta', 'Control lumbopélvico'],
    ['Bird dog', 'Colchoneta', 'Estabilidad lumbar'],
    ['Pallof press en polea', 'Polea', 'Antirrotación'],
    ['Pallof press con banda', 'Banda', 'Antirrotación'],
    ['Crunch abdominal en colchoneta', 'Colchoneta', 'Flexión de tronco'],
    ['Crunch abdominal en máquina', 'Máquina', 'Flexión de tronco'],
    ['Crunch abdominal en polea', 'Polea alta', 'Flexión de tronco'],
    ['Crunch inverso', 'Colchoneta', 'Flexión de pelvis'],
    ['Elevación de rodillas colgado', 'Barra', 'Flexión de cadera'],
    ['Elevación de piernas acostado', 'Colchoneta', 'Flexión de cadera'],
    ['Elevación de piernas colgado', 'Barra', 'Flexión de cadera'],
    ['Rueda abdominal desde rodillas', 'Rueda abdominal y colchoneta', 'Antiextensión'],
    ['Hollow body hold', 'Colchoneta', 'Antiextensión'],
    ['Hollow rocks', 'Colchoneta', 'Antiextensión'],
    ['Russian twist', 'Colchoneta', 'Rotación de tronco'],
    ['Mountain climbers', 'Colchoneta', 'Estabilidad dinámica'],
    ['Bicicleta abdominal', 'Colchoneta', 'Flexión y rotación'],
    ['Heel touches', 'Colchoneta', 'Flexión lateral'],
    ['Elevación de pelvis en colchoneta', 'Colchoneta', 'Retroversión pélvica'],
    ['Marcha de glúteos en puente', 'Colchoneta', 'Estabilidad pélvica'],
    ['Farmer carry unilateral', 'Mancuerna', 'Antiinclinación'],
    ['Suitcase carry', 'Mancuerna', 'Antiinclinación'],
    ['Respiración diafragmática en colchoneta', 'Colchoneta', 'Control respiratorio'],
    ['Brace abdominal en decúbito supino', 'Colchoneta', 'Control abdominal'],
  ],

  'Cardio': [
    ['Caminata en cinta', 'Caminadora', 'Caminata'],
    ['Caminata inclinada en cinta', 'Caminadora', 'Caminata inclinada'],
    ['Trote en cinta', 'Caminadora', 'Carrera'],
    ['Carrera en cinta', 'Caminadora', 'Carrera'],
    ['Bicicleta estática', 'Bicicleta', 'Pedaleo'],
    ['Bicicleta reclinada', 'Bicicleta reclinada', 'Pedaleo'],
    ['Bicicleta de spinning', 'Bicicleta de spinning', 'Pedaleo'],
    ['Elíptica', 'Elíptica', 'Cardio'],
    ['Escaladora', 'Máquina escaladora', 'Subida de escalones'],
    ['Remo ergómetro', 'Máquina de remo', 'Cardio'],
    ['Ski erg', 'Máquina ski erg', 'Cardio'],
    ['Air bike', 'Bicicleta de aire', 'Cardio'],
    ['Saltar la cuerda', 'Cuerda', 'Saltos'],
    ['Jumping jacks', 'Peso corporal', 'Saltos'],
    ['Jumping jacks sin salto', 'Peso corporal', 'Paso lateral'],
    ['Marcha en el sitio', 'Peso corporal', 'Marcha'],
    ['Rodillas altas', 'Peso corporal', 'Carrera en sitio'],
    ['Talones a glúteos', 'Peso corporal', 'Carrera en sitio'],
    ['Burpees', 'Peso corporal', 'Acondicionamiento'],
    ['Burpees sin salto', 'Peso corporal', 'Acondicionamiento'],
    ['Step aeróbico', 'Step', 'Subidas al step'],
    ['Caminata al aire libre', 'Sin equipamiento', 'Caminata'],
    ['Trote al aire libre', 'Sin equipamiento', 'Carrera'],
    ['Subida de escaleras', 'Escaleras', 'Subida de escalones'],
    ['Boxeo de sombra', 'Peso corporal', 'Cardio de combate'],
    ['Battle ropes', 'Cuerdas de batalla', 'Acondicionamiento'],
  ],

  'Otro': [
    ['Aducción de cadera en máquina', 'Máquina', 'Aducción de cadera'],
    ['Aducción de cadera en polea', 'Polea', 'Aducción de cadera'],
    ['Aducción de cadera con banda', 'Banda', 'Aducción de cadera'],
    ['Copenhagen plank modificado', 'Banco y colchoneta', 'Aducción y estabilidad'],
    ['Farmer walk con mancuernas', 'Mancuernas', 'Carga y desplazamiento'],
    ['Paseo del granjero con kettlebells', 'Kettlebells', 'Carga y desplazamiento'],
    ['Empuje de trineo', 'Trineo', 'Empuje y desplazamiento'],
    ['Arrastre de trineo', 'Trineo', 'Tracción y desplazamiento'],
    ['Levantamiento de balón medicinal', 'Balón medicinal', 'Potencia general'],
    ['Lanzamiento de balón medicinal al suelo', 'Balón medicinal', 'Potencia general'],
    ['Get-up turco', 'Kettlebell y colchoneta', 'Estabilidad general'],
    ['Sentarse y levantarse de banco', 'Banco', 'Sentadilla funcional'],
    ['Movilidad de tobillo contra pared', 'Pared', 'Movilidad de tobillo'],
    ['Movilidad de cadera 90/90', 'Colchoneta', 'Movilidad de cadera'],
    ['Rotaciones torácicas en cuadrupedia', 'Colchoneta', 'Movilidad torácica'],
    ['Gato-vaca', 'Colchoneta', 'Movilidad de columna'],
    ['Postura del niño', 'Colchoneta', 'Elongación y movilidad'],
    ['World greatest stretch', 'Colchoneta', 'Movilidad general'],
    ['Estiramiento de cuádriceps de pie', 'Peso corporal', 'Elongación de cuádriceps'],
    ['Estiramiento de cuádriceps acostado de lado', 'Colchoneta', 'Elongación de cuádriceps'],
    ['Estiramiento de isquiotibiales sentado', 'Colchoneta', 'Elongación de isquiotibiales'],
    ['Estiramiento de isquiotibiales acostado con banda', 'Colchoneta y banda', 'Elongación de isquiotibiales'],
    ['Estiramiento de isquiotibiales de pie', 'Peso corporal', 'Elongación de isquiotibiales'],
    ['Estiramiento de glúteos figura cuatro', 'Colchoneta', 'Elongación de glúteos'],
    ['Estiramiento de piriforme sentado', 'Banco', 'Elongación de glúteos'],
    ['Estiramiento de flexores de cadera en zancada', 'Colchoneta', 'Elongación de flexores de cadera'],
    ['Estiramiento de aductores mariposa', 'Colchoneta', 'Elongación de aductores'],
    ['Estiramiento de aductores en rana', 'Colchoneta', 'Elongación de aductores'],
    ['Estiramiento de pantorrilla en pared', 'Pared', 'Elongación de pantorrilla'],
    ['Estiramiento de sóleo en pared', 'Pared', 'Elongación de sóleo'],
    ['Estiramiento de pecho en marco de puerta', 'Marco de puerta', 'Elongación de pecho'],
    ['Estiramiento de pecho en pared', 'Pared', 'Elongación de pecho'],
    ['Estiramiento de dorsal ancho apoyado en banco', 'Banco', 'Elongación de espalda'],
    ['Estiramiento de dorsal ancho en pared', 'Pared', 'Elongación de espalda'],
    ['Estiramiento de tríceps sobre la cabeza', 'Peso corporal', 'Elongación de tríceps'],
    ['Estiramiento de bíceps en pared', 'Pared', 'Elongación de bíceps'],
    ['Estiramiento cruzado de hombro', 'Peso corporal', 'Elongación de hombro'],
    ['Estiramiento de trapecio superior', 'Peso corporal', 'Elongación de cuello'],
    ['Estiramiento de elevador de la escápula', 'Peso corporal', 'Elongación de cuello'],
    ['Rotaciones cervicales suaves', 'Peso corporal', 'Movilidad cervical'],
    ['Rotaciones de hombros', 'Peso corporal', 'Movilidad de hombros'],
    ['Círculos de cadera', 'Peso corporal', 'Movilidad de cadera'],
    ['Círculos de tobillos', 'Peso corporal', 'Movilidad de tobillos'],
    ['Balanceos de pierna frontal', 'Peso corporal', 'Movilidad dinámica'],
    ['Balanceos de pierna lateral', 'Peso corporal', 'Movilidad dinámica'],
    ['Rotaciones de muñecas', 'Peso corporal', 'Movilidad de muñecas'],
    ['Movilidad de muñeca en cuadrupedia', 'Colchoneta', 'Movilidad de muñecas'],
    ['Inclinación pélvica en colchoneta', 'Colchoneta', 'Movilidad lumbopélvica'],
    ['Postura de cobra suave', 'Colchoneta', 'Movilidad de columna'],
    ['Estiramiento de cadena posterior de pie', 'Peso corporal', 'Elongación general'],
    ['Estiramiento de cuerpo completo acostado', 'Colchoneta', 'Elongación general'],
    ['Automasaje de cuádriceps con foam roller', 'Rodillo de espuma', 'Liberación miofascial'],
    ['Automasaje de glúteos con foam roller', 'Rodillo de espuma', 'Liberación miofascial'],
    ['Automasaje dorsal con foam roller', 'Rodillo de espuma', 'Liberación miofascial'],
  ],
}

// ========================================
// NORMALIZACIÓN DE NOMBRES
// ========================================

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// ========================================
// TOTAL DE EJERCICIOS
// ========================================

export const EXERCISE_CATALOG_TOTAL =
  Object.values(CATALOG).reduce(
    (total, rows) => total + rows.length,
    0,
  )

export type CatalogImportResult = {
  available: number
  added: number
  skipped: number
}

// ========================================
// IMPORTACIÓN SEGURA
// ========================================

export async function importExerciseCatalog():
  Promise<CatalogImportResult> {
  return db.transaction(
    'rw',
    db.exercises,
    async () => {
      // Incluye registros activos y eliminados.
      // No restauramos ni sobrescribimos nada.

      const existing =
        await db.exercises.toArray()

      const knownNames = new Set(
        existing.map((item) =>
          normalizeName(item.name),
        ),
      )

      const now = new Date().toISOString()

      const additions: Exercise[] = []

      let skipped = 0

      for (
        const [category, entries] of
        Object.entries(CATALOG) as [
          ExerciseCategory,
          CatalogEntry[],
        ][]
      ) {
        for (
          const [
            name,
            equipment,
            movementPattern,
          ] of entries
        ) {
          const normalized = normalizeName(name)

          if (knownNames.has(normalized)) {
            skipped += 1
            continue
          }

          knownNames.add(normalized)

          additions.push({
            id: crypto.randomUUID(),
            name,
            category,
            equipment,
            movementPattern,
            favorite: false,
            createdAt: now,
            updatedAt: now,
          })
        }
      }

      if (additions.length > 0) {
        await db.exercises.bulkAdd(additions)
      }

      return {
        available: EXERCISE_CATALOG_TOTAL,
        added: additions.length,
        skipped,
      }
    },
  )
}
