def test_game_stats_merge_by_maximum_and_are_validated(signed_in):
    c = signed_in()
    c.put("/api/progress", json={"data": {"games": {"bs:1": {"stars": 2, "best": 40, "plays": 3}}}})
    out = c.put("/api/progress", json={"data": {"games": {"bs:1": {"stars": 3, "best": 10, "plays": 1}, "sg:2": {"stars": 1, "best": 5, "plays": 1}}}}).json()["data"]
    assert out["games"] == {"bs:1": {"stars": 3, "best": 40, "plays": 3}, "sg:2": {"stars": 1, "best": 5, "plays": 1}}
    assert c.get("/api/progress").json()["data"]["games"]["bs:1"]["stars"] == 3


def test_invalid_game_stats_are_rejected(signed_in):
    c = signed_in()
    assert c.put("/api/progress", json={"data": {"games": {"x": {"stars": 9, "best": 1, "plays": 1}}}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"games": {"x": {"stars": 1, "best": -1, "plays": 1}}}}).status_code == 422
    assert c.put("/api/progress", json={"data": {"games": {"k" * 200: {"stars": 1, "best": 1, "plays": 1}}}}).status_code == 422
