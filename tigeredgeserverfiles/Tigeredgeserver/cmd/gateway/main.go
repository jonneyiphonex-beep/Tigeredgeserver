package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
)

var portCatalog = []struct {
	Port  int
	Label string
}{
	{Port: 22, Label: "SSH"},
	{Port: 80, Label: "HTTP"},
	{Port: 443, Label: "HTTPS"},
	{Port: 8443, Label: "MESH"},
	{Port: 8080, Label: "API"},
	{Port: 3306, Label: "DB"},
}

func enableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func portOpen(port int) bool {
	cmd := exec.Command("iptables", "-C", "INPUT", "-p", "tcp", "--dport", strconv.Itoa(port), "-j", "ACCEPT")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

func setPortState(port int, open bool) error {
	if open {
		if portOpen(port) {
			return nil
		}
		cmd := exec.Command("iptables", "-A", "INPUT", "-p", "tcp", "--dport", strconv.Itoa(port), "-j", "ACCEPT")
		return cmd.Run()
	}

	cmd := exec.Command("iptables", "-D", "INPUT", "-p", "tcp", "--dport", strconv.Itoa(port), "-j", "ACCEPT")
	if err := cmd.Run(); err != nil {
		if strings.Contains(err.Error(), "exit status 1") {
			return nil
		}
		return err
	}
	return nil
}

func portsPayload() []map[string]interface{} {
	payload := make([]map[string]interface{}, 0, len(portCatalog))
	for _, item := range portCatalog {
		state := "closed"
		if portOpen(item.Port) {
			state = "open"
		}
		payload = append(payload, map[string]interface{}{
			"port":  item.Port,
			"label": item.Label,
			"state": state,
		})
	}
	return payload
}

func main() {
	fmt.Println("🌐 [TIGEREDGESERVER GATEWAY] Local Offline Mesh Bridge Active...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"secure-offline","latency_ms":0.2}`))
	})

	http.HandleFunc("/ports", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(portsPayload())
			return
		}

		if r.Method == http.MethodPost {
			var req struct {
				Port int  `json:"port"`
				Open bool `json:"open"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				http.Error(w, "invalid request", http.StatusBadRequest)
				return
			}
			if req.Port == 0 {
				http.Error(w, "missing port", http.StatusBadRequest)
				return
			}
			if err := setPortState(req.Port, req.Open); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]interface{}{"port": req.Port, "state": map[bool]string{true: "open", false: "closed"}[req.Open]})
		}
	})

	_ = http.ListenAndServe("127.0.0.1:8443", nil)
}
