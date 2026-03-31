package canonical_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	osp "github.com/anthropics/osp/osp-sdk-go"
)

type vector struct {
	ID          string      `json:"id"`
	Description string      `json:"description"`
	Input       interface{} `json:"input"`
	Expected    string      `json:"expected"`
}

type vectorPack struct {
	Vectors []vector `json:"vectors"`
}

func loadVectors(t *testing.T) []vector {
	t.Helper()
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	data, err := os.ReadFile(filepath.Join(dir, "vectors.json"))
	if err != nil {
		t.Fatalf("failed to read vectors.json: %v", err)
	}
	var pack vectorPack
	if err := json.Unmarshal(data, &pack); err != nil {
		t.Fatalf("failed to parse vectors.json: %v", err)
	}
	return pack.Vectors
}

func TestCanonicalJSONParity(t *testing.T) {
	vectors := loadVectors(t)
	for _, v := range vectors {
		t.Run(v.ID, func(t *testing.T) {
			// Re-marshal the input to raw JSON bytes first
			inputBytes, err := json.Marshal(v.Input)
			if err != nil {
				t.Fatalf("failed to marshal input: %v", err)
			}
			actual, err := osp.CanonicalJSONFromBytes(inputBytes)
			if err != nil {
				t.Fatalf("CanonicalJSONFromBytes error: %v", err)
			}
			if string(actual) != v.Expected {
				t.Errorf("mismatch\n  expected: %s\n  actual:   %s", v.Expected, string(actual))
			}
		})
	}
}
