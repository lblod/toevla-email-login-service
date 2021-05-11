/**
 * Allows constructing a string of random characters.
 */
const LOW = "a".charCodeAt(0);
const HIGH = "z".charCodeAt(0);

/**
 * Emits a random character code.
 *
 * @return {number} character code of a string character.
 */
function randomCharacterCode() {
  const base = LOW;
  const range = HIGH - LOW;
  return base + Math.floor( range * Math.random() );
}

/**
 * Emits a random character string.
 *
 * @return {string} Random character string.
 */
export default function randomCharacterString( length = 32 ) {
  const codes = [];
  for( let i = 0; i < length; i++ )
    codes.push( randomCharacterCode() );
  return String.fromCharCode.apply( null, codes );
}
