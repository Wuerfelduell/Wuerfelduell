/* dd_touch_room ist eine interne Hilfsfunktion: die Spielfunktionen rufen
   sie als Eigentuemer auf, um die Ablaufzeit eines Raums nachzuziehen.
   Die Migration vom 03.09. hat das Ausfuehrungsrecht nur fuer public und
   anon entzogen. Das Standardrecht fuer authenticated blieb bestehen -
   und dazu gehoeren auch angemeldete anonyme Gastidentitaeten.

   Folge: wer die UUID eines fremden Raums kennt, konnte dessen
   Ablaufzeit verlaengern. Die Funktion laeuft als security definer und
   prueft keine Mitgliedschaft; fremde Spielstaende liest sie nicht.

   Das Recht wird jetzt auch fuer authenticated entzogen. Die internen
   Aufrufe aus den security-definer-Funktionen des Eigentuemers bleiben
   moeglich, der Client ruft dd_touch_room nie direkt auf. */

begin;

revoke execute on function public.dd_touch_room(uuid) from public, anon, authenticated;

commit;
