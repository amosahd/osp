package osp

import (
	"testing"
)

func TestCanonicalJSONSortedKeys(t *testing.T) {
	input := map[string]interface{}{
		"z": "last",
		"a": "first",
		"m": "middle",
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"a":"first","m":"middle","z":"last"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONNestedObjects(t *testing.T) {
	input := map[string]interface{}{
		"b": map[string]interface{}{
			"z": 1,
			"a": 2,
		},
		"a": "first",
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"a":"first","b":{"a":2,"z":1}}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONArray(t *testing.T) {
	input := []interface{}{"b", "a", "c"}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	// Arrays preserve order.
	expected := `["b","a","c"]`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONNull(t *testing.T) {
	input := map[string]interface{}{
		"key": nil,
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"key":null}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONBoolean(t *testing.T) {
	input := map[string]interface{}{
		"true":  true,
		"false": false,
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"false":false,"true":true}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONNumbers(t *testing.T) {
	input := map[string]interface{}{
		"int":   42,
		"float": 3.14,
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"float":3.14,"int":42}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONEmptyObject(t *testing.T) {
	result, err := CanonicalJSON(map[string]interface{}{})
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	if string(result) != "{}" {
		t.Errorf("expected {}, got %s", string(result))
	}
}

func TestCanonicalJSONEmptyArray(t *testing.T) {
	result, err := CanonicalJSON([]interface{}{})
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	if string(result) != "[]" {
		t.Errorf("expected [], got %s", string(result))
	}
}

func TestCanonicalJSONString(t *testing.T) {
	result, err := CanonicalJSON("hello")
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	if string(result) != `"hello"` {
		t.Errorf("expected \"hello\", got %s", string(result))
	}
}

func TestCanonicalJSONDeepNesting(t *testing.T) {
	input := map[string]interface{}{
		"c": map[string]interface{}{
			"b": map[string]interface{}{
				"a": "deep",
			},
		},
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"c":{"b":{"a":"deep"}}}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONDeterministic(t *testing.T) {
	input := map[string]interface{}{
		"z": 1,
		"a": 2,
		"m": map[string]interface{}{
			"z": true,
			"a": false,
		},
	}

	// Run multiple times to verify determinism.
	first, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	for i := 0; i < 100; i++ {
		result, err := CanonicalJSON(input)
		if err != nil {
			t.Fatalf("canonical json iteration %d: %v", i, err)
		}
		if string(result) != string(first) {
			t.Fatalf("non-deterministic at iteration %d: got %s, expected %s", i, string(result), string(first))
		}
	}
}

func TestCanonicalJSONFromBytes(t *testing.T) {
	input := []byte(`{"z":"last","a":"first","m":"middle"}`)

	result, err := CanonicalJSONFromBytes(input)
	if err != nil {
		t.Fatalf("canonical json from bytes: %v", err)
	}

	expected := `{"a":"first","m":"middle","z":"last"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONFromBytesInvalid(t *testing.T) {
	_, err := CanonicalJSONFromBytes([]byte("not json"))
	if err == nil {
		t.Error("expected error for invalid json")
	}
}

func TestCanonicalJSONMixedTypes(t *testing.T) {
	input := map[string]interface{}{
		"str":   "hello",
		"num":   42,
		"bool":  true,
		"null":  nil,
		"array": []interface{}{1, "two", false},
		"obj":   map[string]interface{}{"key": "value"},
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"array":[1,"two",false],"bool":true,"null":null,"num":42,"obj":{"key":"value"},"str":"hello"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONStruct(t *testing.T) {
	price := Price{
		Amount:   "25.00",
		Currency: CurrencyUSD,
	}

	result, err := CanonicalJSON(price)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	// Should have sorted keys.
	expected := `{"amount":"25.00","currency":"USD"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONSpecialChars(t *testing.T) {
	input := map[string]interface{}{
		"key": "value with \"quotes\" and \nnewline",
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"key":"value with \"quotes\" and \nnewline"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONArrayOfObjects(t *testing.T) {
	input := []interface{}{
		map[string]interface{}{"b": 2, "a": 1},
		map[string]interface{}{"d": 4, "c": 3},
	}

	result, err := CanonicalJSON(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `[{"a":1,"b":2},{"c":3,"d":4}]`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}

func TestCanonicalJSONNumberPrecision(t *testing.T) {
	// Ensure numbers maintain precision through canonical JSON.
	input := []byte(`{"price":"25.00","count":1000000}`)

	result, err := CanonicalJSONFromBytes(input)
	if err != nil {
		t.Fatalf("canonical json: %v", err)
	}

	expected := `{"count":1000000,"price":"25.00"}`
	if string(result) != expected {
		t.Errorf("expected %s, got %s", expected, string(result))
	}
}
