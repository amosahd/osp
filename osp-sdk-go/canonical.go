package osp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"sort"
)

// CanonicalJSON serializes a value into canonical JSON form.
// Canonical JSON is deterministic: object keys are sorted lexicographically
// at all nesting levels, and no extra whitespace is emitted.
//
// This is used for signing and verifying manifests and other protocol objects.
func CanonicalJSON(v interface{}) ([]byte, error) {
	// First marshal to get a generic JSON representation.
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("canonical json: marshal: %w", err)
	}

	// Parse into a generic structure and re-serialize canonically.
	var generic interface{}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	if err := dec.Decode(&generic); err != nil {
		return nil, fmt.Errorf("canonical json: decode: %w", err)
	}

	return canonicalize(generic)
}

// CanonicalJSONFromBytes takes raw JSON bytes and returns canonical form.
func CanonicalJSONFromBytes(data []byte) ([]byte, error) {
	var generic interface{}
	dec := json.NewDecoder(bytes.NewReader(data))
	dec.UseNumber()
	if err := dec.Decode(&generic); err != nil {
		return nil, fmt.Errorf("canonical json: decode: %w", err)
	}
	return canonicalize(generic)
}

func canonicalize(v interface{}) ([]byte, error) {
	switch val := v.(type) {
	case map[string]interface{}:
		return canonicalizeObject(val)
	case []interface{}:
		return canonicalizeArray(val)
	case json.Number:
		return []byte(val.String()), nil
	case string:
		return json.Marshal(val)
	case bool:
		return json.Marshal(val)
	case nil:
		return []byte("null"), nil
	default:
		return json.Marshal(val)
	}
}

func canonicalizeObject(m map[string]interface{}) ([]byte, error) {
	// Sort keys lexicographically.
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		// Write the key.
		keyBytes, err := json.Marshal(k)
		if err != nil {
			return nil, err
		}
		buf.Write(keyBytes)
		buf.WriteByte(':')

		// Write the value.
		valBytes, err := canonicalize(m[k])
		if err != nil {
			return nil, err
		}
		buf.Write(valBytes)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

func canonicalizeArray(arr []interface{}) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('[')
	for i, elem := range arr {
		if i > 0 {
			buf.WriteByte(',')
		}
		elemBytes, err := canonicalize(elem)
		if err != nil {
			return nil, err
		}
		buf.Write(elemBytes)
	}
	buf.WriteByte(']')
	return buf.Bytes(), nil
}
