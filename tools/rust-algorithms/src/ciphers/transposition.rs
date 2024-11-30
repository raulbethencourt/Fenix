//! Transposition Cipher
//!
//! # Algorithm

use std::collections::BTreeMap;

/// Encrypts a given String with the Transposition cipher
///
/// For each character of the keyword string a new column inside a table is created.
/// Each column receives the corresponding character of the keyword string.
/// Every character of the input string will then be put in the fields from left to right.
/// Empty fields will be filled with the character 'X'.
/// The keyword string and its corresponding column is then sorted by its alphanumeric values.
/// To get the encrypted String every character inside the table will be added from
/// top to bottom and left to right.
///
/// See [Transposition Cipher](https://en.wikipedia.org/wiki/Transposition_cipher) for the theoretical background.
///
/// # Arguments
///
/// * `key` - string that functions as encryption key
/// * `input` - string that is encrypted
///
/// # Returns
///
/// * `enc` - encrypted string
///
/// # Panic
///
/// This function won't panic
///
/// # Examples
///
/// use std::collections::BTreeMap;
///
/// let encrypted = transposition("lorem", "ipsum");
///
pub fn transposition(key: &str, input: &str) -> String {
    let mut to_enc = input.to_uppercase();
    let keyword = key.to_uppercase();
    let keyword_len = keyword.chars().count();
    let input_len = to_enc.chars().count();

    // calculate missing fields in transposition table
    let missing_pos = if input_len % keyword_len == 0 {
        0
    } else {
        keyword_len - input_len % keyword_len
    };

    // fill missing fields with 'X'
    for _ in 0..missing_pos {
        to_enc.push('X');
    }

    // Sort columns by the alphanumeric value of the keyword characters
    let mut treemap = BTreeMap::new();

    for x in 0..keyword_len {
        let mut col = Vec::new();
        let mut n = 0;

        while n < input_len {
            col.push(to_enc.chars().nth(x + n).unwrap());

            n += keyword_len;
        }
        treemap.insert(keyword.chars().nth(x).unwrap(), col);
    }

    // read characters from top to bottom and left to right
    let mut enc = String::from("");

    for value in treemap.values() {
        let s: String = value.iter().collect();
        enc.push_str(&s);
    }
    enc
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_word() {
        assert_eq!("OMLERX", transposition("key", "lorem"));
    }

    #[test]
    fn test_sentence_with_punctuation_marks() {
        assert_eq!("OMIUXLE S!R,PMX", transposition("key", "Lorem, ipsum!"));
    }

    #[test]
    fn test_punctuation_marks() {
        assert_eq!("OM;?LE.!R,:X", transposition("key", "lorem,.;:!?"));
    }

    #[test]
    fn test_same_length() {
        assert_eq!("ELMOR", transposition("lorem", "lorem"));
    }

    #[test]
    fn test_keyword_longer_than_input() {
        assert_eq!("XITXXXM", transposition("keyword", "tim"));
    }

    #[test]
    fn test_non_ascii() {
        assert_eq!("A😀B", transposition("key", "😀AB"));
    }
}
