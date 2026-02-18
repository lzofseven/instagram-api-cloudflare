<?php
header('Content-Type: application/json');

$username = isset($_GET['username']) ? $_GET['username'] : '';

if (empty($username)) {
    echo json_encode(['error' => 'Username is required']);
    exit;
}

// Configurações do Cloudflare Worker/Pages Proxy
$worker_url = "https://insta-proxy-lz.pages.dev/?url=";

function getInstagramData($username) {
    $url = "https://www.instagram.com/api/v1/users/web_profile_info/?username=" . urlencode($username);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-ig-app-id: 936619743392459',
        'Accept: */*',
        'Accept-Language: en-US,en;q=0.9',
        'Origin: https://www.instagram.com',
        'Referer: https://www.instagram.com/' . $username . '/'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        return null;
    }

    return json_decode($response, true);
}

$data = getInstagramData($username);

if (!$data || !isset($data['data']['user'])) {
    echo json_encode(['error' => 'User not found or Instagram API error']);
    exit;
}

$user = $data['data']['user'];

$result = [
    "username" => $user['username'],
    "full_name" => $user['full_name'],
    "biography" => $user['biography'],
    "profile_pic_url" => $worker_url . urlencode($user['profile_pic_url_hd']),
    "follower_count" => $user['edge_followed_by']['count'],
    "following_count" => $user['edge_follow']['count'],
    "media_count" => $user['edge_owner_to_timeline_media']['count'],
    "is_private" => $user['is_private'],
    "is_verified" => $user['is_verified'],
    "user_id" => $user['id'],
    "external_url" => $user['external_url'],
    "_chaining_results" => []
];

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
?>
