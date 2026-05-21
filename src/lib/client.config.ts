export const clientConfig = {
  name: "Natación Riveros",
  businessName: "Natación Riveros",
  businessDescription: "Complejo de natación y actividades acuáticas en San Juan. Disciplinas: Natación para Bebés, Natación para Niños, Natación para Adultos, Adultos Mayores, Aqua Cross, Aqua Gym, Psicomotricidad y Taller TEA/TDAH.",
  behavior: "amable y profesional",
  slogan: "",
  address: "San Juan",
  phone: "2645616367",

  hours: {
    monday:    { open: "08:00", close: "22:00" },
    tuesday:   { open: "08:00", close: "22:00" },
    wednesday: { open: "08:00", close: "22:00" },
    thursday:  { open: "08:00", close: "22:00" },
    friday:    { open: "08:00", close: "22:00" },
    saturday:  { open: "08:00", close: "14:00" },
    sunday:    null,
  },

  services: [
    { id: "aqua_cross",       name: "Aqua Cross",                    price: 40000, duration: 60, description: "Profesora Guadalupe Martinez — Mar/Jue 15:00" },
    { id: "bebes",            name: "Natación para Bebés",           price: 35000, duration: 60, description: "Profesor Guido Riveros — Sáb 11:00, 12:00 / Mié 19:00" },
    { id: "ninos",            name: "Natación para Niños",           price: 45000, duration: 60, description: "Profesor Guido Riveros — 2x/sem" },
    { id: "adultos",          name: "Natación para Adultos",         price: 50000, duration: 60, description: "Profesora Magali Balmaceda — Lun/Mié/Vie" },
    { id: "adulto_mayor",     name: "Natación Adulto Mayor",         price: 40000, duration: 60, description: "Profesor Guido Riveros — Mar/Jue" },
    { id: "psicomotricidad",  name: "Psicomotricidad para Bebés",    price: 0,     duration: 60, description: "Lic. Adriana Aguilera / Lic. Soledad Sanchez" },
    { id: "psicomo_ninos",    name: "Psicomotricidad para Niños",    price: 0,     duration: 60, description: "Lic. Adriana Aguilera / Lic. Soledad Sanchez" },
    { id: "tea_tdah",         name: "Taller TEA y TDAH",             price: 60000, duration: 60, description: "Profesor Guido Riveros — 12 clases" },
    { id: "rehabilitacion",   name: "Rehabilitación e Hidroterapia", price: 0,     duration: 60, description: "Lic. Márquez Marilen — Sáb 13:00" },
  ],

  combos: [],

  botName: "Valeria",
  botBooking: true,
  appointmentDuration: 60,
  loginPin: "2520",

  responseDelayMs: 8000,
  appointments: {
    enabled: true,
    resource: "Natación Riveros",
  },
};
