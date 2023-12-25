---
external: false
draft: true
title: "How to deploy Kubernetes Dashboard with read-only access"
description: "Deploying Kubernetes Dashboard with read-only access"
date: 2023-12-28
---

A couple of weeks ago DigitalOcean announced end of support of the their built-in Kubernetes dashboard. I was a bit disappointing because my team was using it for a while and it was a great tool to quickly check the status of the cluster and the pods, especially for people that are not familiar with k8s.I am sure that there are a lot of [other people](https://ideas.digitalocean.com/kubernetes/p/disappointed-to-see-the-k8s-dashboard-deprecation) that are in the same situation, so I decided to write a short post about how to deploy the official Kubernetes Dashboard with read-only access.

I started looking for a replacement that would be easy to deploy and would provide similar functionality. I have used in the past [Lens](https://k8slens.dev/) community version in the past , I was convenient and easy to use it, after trying to install it with their latest changes seems too complex to setup and use for our simple use case. So I decided to go with the official Kubernetes Dashboard. It is a great tool, but it requires a bit of configuration to make it work with read-only access to the cluster.

## Install Kubernetes Dashboard

Requirements:

- [kubectl](https://kubernetes.io/docs/tasks/tools/#kubectl)
- kubeconfig with admin access to the cluster

The first step is to install the Kubernetes Dashboard. Currently the latest version is v3.0.0 but it's still in alpha so we will go with v2.7.0 instead. You can find the latest version [here](https://github.com/kubernetes/dashboard/releases). I would also recommend to download the yaml file instead, because you can set the max resources allowed to be used by the k8s dashboard pods and then apply it, you can also save it somewhere in a git repo.

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml
```

After the deployment is finished you can check the status of the pods

```bash
kubectl get pods -n kubernetes-dashboard
```

To access the dashboard you need to create a proxy to the kubernetes-dashboard service

```bash
kubectl proxy
```

Then you can access the dashboard at http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

To login you can use your k8s config file, usually located at `~/.kube/config`, your k8s config file should look something like this:

```yaml
apiVersion: v1
clusters:
  - cluster:
      certificate-authority-data: DATA+OMITTED
      server: https://test-k8s-cluster-url.com
    name: test-k8s
contexts:
  - context:
      cluster: test-k8s
      user: clusterUser_testing_test-k8s
    name: test-k8s
current-context: test-k8s
kind: Config
preferences: {}
users:
  - name: clusterUser_testing_test-k8s
    user:
      client-certificate-data: DATA+OMITTED
      client-key-data: DATA+OMITTED
      token: REDACTED
```

Or use can use the token from the config file. You can either open the config file and copy the token or use the following command to get the token.

```bash
grep 'token:' ~/.kube/config| head -1 | cut -d ":" -f2
```
